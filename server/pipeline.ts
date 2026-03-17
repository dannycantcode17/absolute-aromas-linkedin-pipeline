/**
 * Pipeline Orchestration Service
 *
 * Coordinates the full generation lifecycle:
 * 1. Fetch live style guide from Notion
 * 2. Generate post variants via Claude
 * 3. Run guardrail checks on every variant
 * 4. Store results and route to approver
 *
 * This module is called from tRPC procedures and the retry worker.
 */

import { nanoid } from "nanoid";
import {
  addAuditEntry,
  createApprovalToken,
  createGuardrailReviews,
  createPost,
  getApproverConfig,
  getJobById,
  supersedePreviousIterations,
  updateJobStatus,
} from "./db";
import { sendApprovalEmail } from "./email";
import { generatePostVariants } from "./generation";
import { runGuardrails } from "./guardrails";
import { fetchStyleGuide, NotionUnavailableError } from "./notion";

export interface PipelineRunOptions {
  jobId: number;
  notionApiKey: string;
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
  const { jobId, notionApiKey, appBaseUrl, editFeedback, variantCount = 3 } = options;

  const job = await getJobById(jobId);
  if (!job) return { success: false, status: "error", message: `Job ${jobId} not found` };

  // ── Step 1: Fetch live style guide ────────────────────────────────────────
  let styleGuideText: string;
  try {
    styleGuideText = await fetchStyleGuide(notionApiKey);
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "style_guide_fetched",
      details: { pageId: "326362aad87381b89061e17c31c38873" },
    });
  } catch (err) {
    if (err instanceof NotionUnavailableError) {
      await updateJobStatus(jobId, "pending_style_guide");
      await addAuditEntry({
        jobId,
        actor: "system",
        action: "style_guide_fetch_failed",
        details: { error: err.message },
      });
      return {
        success: false,
        status: "pending_style_guide",
        message: `Notion unavailable: ${err.message}. Job queued for retry.`,
      };
    }
    throw err;
  }

  // ── Step 2: Mark as generating ────────────────────────────────────────────
  await updateJobStatus(jobId, "generating", {
    styleGuideSnapshot: styleGuideText.slice(0, 10000), // store first 10k chars
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
    });
    await addAuditEntry({
      jobId,
      actor: "system",
      action: "variants_generated",
      details: { count: variants.length, editFeedback: editFeedback ?? null },
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

    // We need the post ID to create guardrail reviews
    // Re-fetch the post we just created by querying the latest for this job/variant
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

  // Generate a secure approval token
  const token = nanoid(48);
  await createApprovalToken(jobId, job.requiredApprover, token);

  // Get the generated posts for the email
  const { getActivePostsByJobId: getActivePosts } = await import("./db");
  const activePosts = await getActivePosts(jobId);
  const currentPosts = activePosts.filter((p) => p.iteration === iteration);

  // Mark posts as pending_approval
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
