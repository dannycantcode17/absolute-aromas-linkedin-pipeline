/**
 * Pipeline Orchestration Service
 *
 * Coordinates the full generation lifecycle:
 * 1. Fetch style guide from DB (in-app editable, replaces Notion fetch)
 * 2. Generate post/blog variants via Claude
 * 3. Run guardrail checks on every variant
 * 4. Store results and route to approver
 *
 * Supports three profiles: aa_company | david_personal | blog_post
 */

import { nanoid } from "nanoid";
import {
  addAuditEntry,
  createApprovalToken,
  createGuardrailReviews,
  createPost,
  getApproverConfig,
  getJobById,
  getStyleGuideForProfile,
  supersedePreviousIterations,
  updateJobStatus,
} from "./db";
import { sendApprovalEmail } from "./email";
import { generatePostVariants } from "./generation";
import { runGuardrails } from "./guardrails";

export interface PipelineRunOptions {
  jobId: number;
  appBaseUrl: string;
  editFeedback?: string;
  variantCount?: number;
}

export interface PipelineResult {
  success: boolean;
  status: "generated" | "pending_style_guide" | "pending_guardrail" | "error";
  message: string;
  variantsGenerated?: number;
  flaggedVariants?: number;
}

export async function runGenerationPipeline(options: PipelineRunOptions): Promise<PipelineResult> {
  const { jobId, appBaseUrl, editFeedback } = options;

  const job = await getJobById(jobId);
  if (!job) return { success: false, status: "error", message: `Job ${jobId} not found` };

  // Blog posts always get 2 variants; LinkedIn posts default to 3
  const variantCount = options.variantCount ?? (job.profile === "blog_post" ? 2 : 3);

  // ── Step 1: Fetch style guide from DB ─────────────────────────────────────
  const styleGuideRow = await getStyleGuideForProfile(job.profile);
  const styleGuideText = styleGuideRow?.content ?? "";

  if (!styleGuideText) {
    // Hard fail: style guide must be configured before generation can proceed
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "style_guide_fetch_failed",
      details: { error: `No style guide configured for profile: ${job.profile}` },
    });
    await updateJobStatus(jobId, "pending_style_guide");
    const profileLabel =
      job.profile === "aa_company" ? "AA Company Page" :
      job.profile === "david_personal" ? "David Personal Page" :
      "Blog Post";
    throw new Error(
      `Style guide not configured — go to Admin → Settings to set it up for the ${profileLabel} profile.`
    );
  } else {
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "style_guide_fetched",
      details: { profile: job.profile, source: "database" },
    });
  }

  // ── Step 2: Mark as generating ────────────────────────────────────────────
  await updateJobStatus(jobId, "generating", {
    styleGuideSnapshot: styleGuideText.slice(0, 10000),
    generationAttempts: (job.generationAttempts ?? 0) + 1,
  });

  // Supersede any previous iteration drafts on regeneration
  if (editFeedback) {
    await supersedePreviousIterations(jobId, (job.generationAttempts ?? 0) + 1);
  }

  // ── Step 3: Generate variants ─────────────────────────────────────────────
  let variants;
  try {
    variants = await generatePostVariants({
      profile: job.profile,
      topic: job.topic,
      contentPillar: job.contentPillar,
      targetAudience: job.targetAudience ?? undefined,
      toneHint: job.toneHint ?? undefined,
      referenceUrl: job.referenceUrl ?? undefined,
      namedClientFlag: job.namedClientFlag,
      styleGuideText,
      editFeedback,
      variantCount,
      // Blog-specific fields
      blogKeyword: job.blogKeyword ?? undefined,
      blogTone: (job.blogTone as "educational" | "thought_leadership" | "story_driven") ?? undefined,
      blogWordCount: (job.blogWordCount as "short" | "standard" | "long") ?? undefined,
    });
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "variants_generated",
      details: { count: variants.length, editFeedback: editFeedback ?? null, profile: job.profile },
    });
  } catch (err) {
    await updateJobStatus(jobId, "pending_style_guide");
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "generation_failed",
      details: { error: String(err) },
    });
    return { success: false, status: "error", message: `Generation failed: ${String(err)}` };
  }

  // ── Step 4: Guardrail checks ──────────────────────────────────────────────
  const iteration = (job.generationAttempts ?? 1);
  let hasBlockingFlags = false;
  const postIds: number[] = [];

  for (const variant of variants) {
    const guardrailResult = runGuardrails(variant.content, {
      namedClientFlag: job.namedClientFlag,
    });

    const postStatus = guardrailResult.passed
      ? ("draft" as const)
      : ("flagged" as const);

    if (!guardrailResult.passed) hasBlockingFlags = true;

    await createPost({
      jobId,
      variantLabel: variant.label,
      content: variant.content,
      iteration,
      status: postStatus,
      guardrailFlags: guardrailResult.flags,
      editFeedback: editFeedback ?? null,
    });

    const { getActivePostsByJobId } = await import("./db");
    const activePosts = await getActivePostsByJobId(jobId);
    const thisPost = activePosts.find(
      (p) => p.variantLabel === variant.label && p.iteration === iteration
    );

    if (thisPost && guardrailResult.flags.length > 0) {
      await createGuardrailReviews(thisPost.id, guardrailResult.flags);
      postIds.push(thisPost.id);
    }
  }

  // ── Step 5: Route based on guardrail results ──────────────────────────────
  if (hasBlockingFlags) {
    await updateJobStatus(jobId, "pending_guardrail");
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "guardrail_block",
      details: { postIds },
    });
    return {
      success: false,
      status: "pending_guardrail",
      message: "One or more variants have blocking guardrail flags. Manual review required.",
      variantsGenerated: variants.length,
      flaggedVariants: postIds.length,
    };
  }

  // ── Step 6: Send approval email ───────────────────────────────────────────
  const approverConfig = await getApproverConfig(job.requiredApprover);
  if (!approverConfig) {
    await updateJobStatus(jobId, "pending_style_guide");
    return { success: false, status: "error", message: "Approver config not found" };
  }

  const token = nanoid(48);
  await createApprovalToken({
    token,
    jobId,
    approverRole: job.requiredApprover,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const { getActivePostsByJobId: getActivePosts } = await import("./db");
  const activePosts = await getActivePosts(jobId);
  const currentPosts = activePosts.filter((p) => p.iteration === iteration);

  for (const post of currentPosts) {
    const { updatePostStatus } = await import("./db");
    await updatePostStatus(post.id, "pending_approval");
  }

  await updateJobStatus(jobId, "pending_approval");

  await sendApprovalEmail({
    job: { ...job, status: "pending_approval" },
    posts: currentPosts.map((p) => ({ ...p, status: "pending_approval" as const })),
    approverName: approverConfig.name,
    approverEmail: approverConfig.email,
    approverRole: job.requiredApprover,
    approvalToken: token,
    appBaseUrl,
  });

  await addAuditEntry({
    jobId,
    actor: "system",
    action: "approval_email_sent",
    details: {
      approver: job.requiredApprover,
      approverEmail: approverConfig.email,
      variantCount: currentPosts.length,
    },
  });

  return {
    success: true,
    status: "generated",
    message: `${variants.length} variants generated and sent to ${approverConfig.name} for approval.`,
    variantsGenerated: variants.length,
    flaggedVariants: 0,
  };
}
