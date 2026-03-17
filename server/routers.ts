import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addAuditEntry,
  consumeApprovalToken,
  createIdeaBatch,
  createIdeas,
  createJob,
  getAllApproverConfigs,
  getAllUsers,
  getApprovalToken,
  getApproverConfig,
  getAuditLog,
  getIdeasByBatchId,
  getIdeaBatchById,
  getJobById,
  getPostById,
  getPostsByJobId,
  getReadyToPostQueue,
  listIdeaBatches,
  listJobs,
  markPostPublished,
  resolveGuardrailReview,
  updateApproverConfig,
  updateIdeaStatus,
  updateJobStatus,
  updatePostStatus,
  updateUserRole,
  getPendingGuardrailReviews,
  getActivePostsByJobId,
} from "./db";
import { sendApprovalConfirmationEmail, sendEditRequestEmail } from "./email";
import { runGenerationPipeline } from "./pipeline";

// ─── Content Pillars (sourced from style guide) ───────────────────────────────

export const AA_COMPANY_PILLARS = [
  "Manufacturer Authority",
  "Private Label Education",
  "Made by Makers",
  "ICP Pain Points",
  "Social Proof & Case Studies",
  "Industry News & Commentary",
];

export const DAVID_PERSONAL_PILLARS = [
  "Industry Insider",
  "Sourcing & Origin",
  "Quality & Adulteration",
  "Founder Perspective",
  "Brand Advice",
  "Industry History & Evolution",
];

// ─── Helper: get app base URL ─────────────────────────────────────────────────

function getAppBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${host}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  jobs: router({
    /** Submit a new content idea — available to all authenticated users */
    submit: protectedProcedure
      .input(
        z.object({
          profile: z.enum(["aa_company", "david_personal"]),
          contentPillar: z.string().min(1).max(128),
          topic: z.string().min(10).max(2000),
          targetAudience: z.string().max(500).optional(),
          toneHint: z.string().max(500).optional(),
          referenceUrl: z.string().url().optional().or(z.literal("")),
          namedClientFlag: z.boolean().default(false),
          variantCount: z.number().int().min(2).max(5).default(3),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const requiredApprover: "danny" | "david" = input.profile === "david_personal" ? "david" : "danny";

        // If named client flag is set, job starts as pending_confirmation
        const initialStatus = input.namedClientFlag ? "pending_confirmation" : "pending_style_guide";

        const jobData = {
          submittedById: ctx.user.id,
          profile: input.profile,
          contentPillar: input.contentPillar,
          topic: input.topic,
          targetAudience: input.targetAudience ?? null,
          toneHint: input.toneHint ?? null,
          referenceUrl: input.referenceUrl || null,
          namedClientFlag: input.namedClientFlag,
          namedClientConfirmed: false,
          status: initialStatus as typeof initialStatus,
          requiredApprover,
        };

        await createJob(jobData);

        // Re-fetch to get the ID
        const allJobs = await listJobs({ submittedById: ctx.user.id });
        const newJob = allJobs[0]; // Most recent

        await addAuditEntry({
          jobId: newJob.id,
          actor: ctx.user.name ?? ctx.user.openId,
          action: "job_submitted",
          details: {
            profile: input.profile,
            contentPillar: input.contentPillar,
            namedClientFlag: input.namedClientFlag,
          },
        });

        // If no named client flag, trigger generation immediately
        if (!input.namedClientFlag) {
          const notionApiKey = process.env.NOTION_API_KEY ?? "";
          const appBaseUrl = getAppBaseUrl(ctx.req);
          // Run async — don't block the response
          runGenerationPipeline({
            jobId: newJob.id,
            notionApiKey,
            appBaseUrl,
            variantCount: input.variantCount,
          }).catch((err) => console.error("[Pipeline] Error:", err));
        }

        return { jobId: newJob.id, status: initialStatus };
      }),

    /** Confirm named client usage and trigger generation */
    confirmNamedClient: protectedProcedure
      .input(z.object({ jobId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        if (job.submittedById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (job.status !== "pending_confirmation") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not awaiting confirmation" });
        }

        await updateJobStatus(input.jobId, "pending_style_guide", { namedClientConfirmed: true });
        await addAuditEntry({
          jobId: input.jobId,
          actor: ctx.user.name ?? ctx.user.openId,
          action: "named_client_confirmed",
        });

        const notionApiKey = process.env.NOTION_API_KEY ?? "";
        const appBaseUrl = getAppBaseUrl(ctx.req);
        runGenerationPipeline({ jobId: input.jobId, notionApiKey, appBaseUrl }).catch((err) =>
          console.error("[Pipeline] Error:", err)
        );

        return { success: true };
      }),

    /** List jobs — admins see all, users see their own */
    list: protectedProcedure
      .input(
        z.object({
          status: z
            .array(
              z.enum([
                "pending_confirmation",
                "pending_style_guide",
                "generating",
                "pending_guardrail",
                "pending_approval",
                "approved",
                "rejected",
                "published",
              ])
            )
            .optional(),
          profile: z.enum(["aa_company", "david_personal"]).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin";
        return listJobs({
          status: input?.status,
          profile: input?.profile,
          submittedById: isAdmin ? undefined : ctx.user.id,
        });
      }),

    /** Get a single job with its posts */
    get: protectedProcedure
      .input(z.object({ jobId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        if (job.submittedById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const jobPosts = await getPostsByJobId(input.jobId);
        return { job, posts: jobPosts };
      }),

    /** Retry generation for a stuck job */
    retryGeneration: protectedProcedure
      .input(z.object({ jobId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });

        const notionApiKey = process.env.NOTION_API_KEY ?? "";
        const appBaseUrl = getAppBaseUrl(ctx.req);
        const result = await runGenerationPipeline({ jobId: input.jobId, notionApiKey, appBaseUrl });
        return result;
      }),

    /** Get content pillars for a profile */
    getPillars: publicProcedure
      .input(z.object({ profile: z.enum(["aa_company", "david_personal"]) }))
      .query(({ input }) => {
        return input.profile === "aa_company" ? AA_COMPANY_PILLARS : DAVID_PERSONAL_PILLARS;
      }),
  }),

  // ─── Approval ──────────────────────────────────────────────────────────────

  approval: router({
    /**
     * Get job details for the approval page using a token.
     * Public — the approver clicks a link in their email.
     */
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenRecord = await getApprovalToken(input.token);
        if (!tokenRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired token" });
        if (tokenRecord.used) throw new TRPCError({ code: "BAD_REQUEST", message: "This approval link has already been used" });
        if (new Date() > tokenRecord.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This approval link has expired" });

        const job = await getJobById(tokenRecord.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });

        const jobPosts = await getActivePostsByJobId(tokenRecord.jobId);

        return {
          job,
          posts: jobPosts,
          approverRole: tokenRecord.approverRole,
          tokenValid: true,
        };
      }),

    /**
     * Approve a specific post variant.
     * GUARDRAIL: approverRole from token must match job.requiredApprover.
     */
    approve: publicProcedure
      .input(
        z.object({
          token: z.string(),
          postId: z.number().int(),
          suggestedPublishDate: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const tokenRecord = await getApprovalToken(input.token);
        if (!tokenRecord || tokenRecord.used) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or already-used token" });
        }
        if (new Date() > tokenRecord.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
        }

        const post = await getPostById(input.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

        const job = await getJobById(post.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

        // ── HARD GUARDRAIL: approver identity check ──────────────────────────
        if (tokenRecord.approverRole !== job.requiredApprover) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `This post requires approval from ${job.requiredApprover}. You are authenticated as ${tokenRecord.approverRole}.`,
          });
        }

        // Ensure post belongs to this token's job
        if (post.jobId !== tokenRecord.jobId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Post does not belong to this approval request" });
        }

        const approverConfig = await getApproverConfig(tokenRecord.approverRole);
        const approverName = approverConfig?.name ?? tokenRecord.approverRole;

        const suggestedDate = input.suggestedPublishDate
          ? new Date(input.suggestedPublishDate)
          : null;

        // Approve the selected post
        await updatePostStatus(input.postId, "approved", {
          approvedBy: approverName,
          approvedAt: new Date(),
          suggestedPublishDate: suggestedDate,
        });

        // Reject all other variants for this job
        const allPosts = await getActivePostsByJobId(job.id);
        for (const p of allPosts) {
          if (p.id !== input.postId) {
            await updatePostStatus(p.id, "rejected", {
              rejectionReason: "Another variant was approved",
            });
          }
        }

        // Update job status
        await updateJobStatus(job.id, "approved");

        // Consume the token
        await consumeApprovalToken(input.token);

        await addAuditEntry({
          jobId: job.id,
          postId: input.postId,
          actor: approverName,
          action: "post_approved",
          details: { variantLabel: post.variantLabel, approverRole: tokenRecord.approverRole },
        });

        // Send confirmation notification
        await sendApprovalConfirmationEmail({
          job,
          post: { ...post, status: "approved", approvedBy: approverName, approvedAt: new Date() },
          approverName,
        });

        return { success: true, message: "Post approved and added to the Ready to Post queue." };
      }),

    /**
     * Request edits — triggers regeneration with feedback.
     */
    requestEdit: publicProcedure
      .input(
        z.object({
          token: z.string(),
          feedback: z.string().min(10).max(2000),
          variantCount: z.number().int().min(2).max(5).default(3),
        })
      )
      .mutation(async ({ input }) => {
        const tokenRecord = await getApprovalToken(input.token);
        if (!tokenRecord || tokenRecord.used) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or already-used token" });
        }
        if (new Date() > tokenRecord.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
        }

        const job = await getJobById(tokenRecord.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });

        if (tokenRecord.approverRole !== job.requiredApprover) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Consume old token — a new one will be issued after regeneration
        await consumeApprovalToken(input.token);

        const approverConfig = await getApproverConfig(tokenRecord.approverRole);
        const approverName = approverConfig?.name ?? tokenRecord.approverRole;

        await addAuditEntry({
          jobId: job.id,
          actor: approverName,
          action: "edit_requested",
          details: { feedback: input.feedback },
        });

        // Trigger regeneration with feedback
        const notionApiKey = process.env.NOTION_API_KEY ?? "";
        // We need the app base URL — use a placeholder that will be resolved in the pipeline
        const appBaseUrl = process.env.APP_BASE_URL ?? "https://localhost:3000";

        runGenerationPipeline({
          jobId: job.id,
          notionApiKey,
          appBaseUrl,
          editFeedback: input.feedback,
          variantCount: input.variantCount,
        }).catch((err) => console.error("[Pipeline] Regeneration error:", err));

        return {
          success: true,
          message: "Feedback received. New variants are being generated and will be emailed to you shortly.",
        };
      }),

    /**
     * Reject a job entirely.
     */
    reject: publicProcedure
      .input(
        z.object({
          token: z.string(),
          reason: z.string().min(5).max(1000),
        })
      )
      .mutation(async ({ input }) => {
        const tokenRecord = await getApprovalToken(input.token);
        if (!tokenRecord || tokenRecord.used) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or already-used token" });
        }

        const job = await getJobById(tokenRecord.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });

        if (tokenRecord.approverRole !== job.requiredApprover) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Reject all active posts
        const activePosts = await getActivePostsByJobId(job.id);
        for (const p of activePosts) {
          await updatePostStatus(p.id, "rejected", { rejectionReason: input.reason });
        }

        await updateJobStatus(job.id, "rejected");
        await consumeApprovalToken(input.token);

        const approverConfig = await getApproverConfig(tokenRecord.approverRole);
        const approverName = approverConfig?.name ?? tokenRecord.approverRole;

        await addAuditEntry({
          jobId: job.id,
          actor: approverName,
          action: "job_rejected",
          details: { reason: input.reason },
        });

        return { success: true, message: "Job rejected." };
      }),

    /** Admin: list jobs pending approval */
    listPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return listJobs({ status: ["pending_approval", "pending_guardrail"] });
    }),
  }),

  // ─── Ready to Post Queue ───────────────────────────────────────────────────

  queue: router({
    /** Get all approved posts awaiting manual publishing */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getReadyToPostQueue();
    }),

    /** Mark a post as manually published — requires LinkedIn URL to confirm */
    markPublished: protectedProcedure
      .input(
        z.object({
          postId: z.number().int(),
          linkedInUrl: z.string().url({ message: "Please enter the live LinkedIn post URL" }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const post = await getPostById(input.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        if (post.status !== "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Post is not in approved status" });
        }

        // Validate the URL looks like a LinkedIn post URL
        if (!input.linkedInUrl.includes("linkedin.com")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "URL must be a LinkedIn post URL (linkedin.com)",
          });
        }

        const publisherName = ctx.user.name ?? ctx.user.openId;
        await markPostPublished(input.postId, publisherName, input.linkedInUrl);

        await updateJobStatus(post.jobId, "published");

        await addAuditEntry({
          jobId: post.jobId,
          postId: input.postId,
          actor: publisherName,
          action: "confirmed_published",
          details: { publishedBy: publisherName, linkedInUrl: input.linkedInUrl },
        });

        return { success: true };
      }),

    /** Get analytics data for the dashboard strip */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getQueueAnalytics } = await import("./db");
      return getQueueAnalytics();
    }),
  }),

  // ─── Guardrail Reviews ─────────────────────────────────────────────────────

  guardrails: router({
    listPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getPendingGuardrailReviews();
    }),

    resolve: protectedProcedure
      .input(z.object({ reviewId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const resolverName = ctx.user.name ?? ctx.user.openId;
        await resolveGuardrailReview(input.reviewId, resolverName);
        await addAuditEntry({
          actor: resolverName,
          action: "guardrail_resolved",
          details: { reviewId: input.reviewId },
        });
        return { success: true };
      }),

    /** After resolving all flags, manually trigger approval routing */
    releaseToApproval: protectedProcedure
      .input(z.object({ jobId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const job = await getJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });

        const notionApiKey = process.env.NOTION_API_KEY ?? "";
        const appBaseUrl = getAppBaseUrl(ctx.req);
        const result = await runGenerationPipeline({ jobId: input.jobId, notionApiKey, appBaseUrl });
        return result;
      }),
  }),

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  audit: router({
    list: protectedProcedure
      .input(z.object({ jobId: z.number().int().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAuditLog(input.jobId);
      }),
  }),

  // ─── Idea Generator ─────────────────────────────────────────────────────────────

  ideas: router({
    /**
     * Generate a batch of ~10 content ideas using Claude.
     * Returns the batch ID + ideas immediately after generation.
     */
    generate: protectedProcedure
      .input(
        z.object({
          promptTopic: z.string().min(5).max(500),
          contentPillar: z.string().optional(),
          profile: z.enum(["aa_company", "david_personal", "both"]).default("both"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const allPillars = [...AA_COMPANY_PILLARS, ...DAVID_PERSONAL_PILLARS];
        const pillarList = allPillars.map((p) => `- ${p}`).join("\n");

        const profileContext =
          input.profile === "aa_company"
            ? "Absolute Aromas Company Page (B2B, targeting private label buyers, cosmetic formulators, and wellness brands)"
            : input.profile === "david_personal"
            ? "David Tomlinson Personal Page (thought leadership, founder perspective, industry insider)"
            : "either the Absolute Aromas Company Page or David Tomlinson's Personal Page";

        const systemPrompt = `You are a LinkedIn content strategist for Absolute Aromas, a UK-based essential oil manufacturer and private label specialist.

Absolute Aromas is known for:
- GC-MS testing on every batch
- UK manufacturing with global sourcing
- Private label services for wellness brands
- 30+ years of expertise in aromatherapy

Content pillars available:
${pillarList}

You must return a JSON array of exactly 10 content ideas. Each idea must be distinct, specific, and immediately actionable as a LinkedIn post. Avoid vague or generic ideas.

For each idea return:
- title: A compelling 5-10 word headline/hook (not a question unless it's genuinely provocative)
- description: 2-3 sentences explaining the specific angle, what data/story/insight to use, and why it will resonate
- suggestedPillar: The best matching content pillar from the list above
- suggestedProfile: "aa_company" or "david_personal"
- rationale: One sentence on why this fits the Absolute Aromas brand voice`;

        const userPrompt = `Generate 10 LinkedIn content ideas for ${profileContext}.

Topic/theme to explore: ${input.promptTopic}${input.contentPillar ? `\nFocus on this content pillar: ${input.contentPillar}` : ""}

Return a JSON array of 10 ideas.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "content_ideas",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        suggestedPillar: { type: "string" },
                        suggestedProfile: { type: "string", enum: ["aa_company", "david_personal"] },
                        rationale: { type: "string" },
                      },
                      required: ["title", "description", "suggestedPillar", "suggestedProfile", "rationale"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = response.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
          ideas: Array<{
            title: string;
            description: string;
            suggestedPillar: string;
            suggestedProfile: "aa_company" | "david_personal";
            rationale: string;
          }>;
        };

        const generatedIdeas = parsed.ideas ?? [];

        // Persist the batch
        const batchInsert = await createIdeaBatch({
          submittedById: ctx.user.id,
          promptTopic: input.promptTopic,
          contentPillar: input.contentPillar ?? null,
          profile: input.profile,
        });

        const batchId = (batchInsert as { insertId?: number })?.insertId ?? 0;

        // Persist the ideas
        await createIdeas(
          generatedIdeas.map((idea) => ({
            batchId,
            title: idea.title,
            description: idea.description,
            suggestedPillar: idea.suggestedPillar,
            suggestedProfile: idea.suggestedProfile,
            rationale: idea.rationale,
            status: "pending" as const,
          }))
        );

        const savedIdeas = await getIdeasByBatchId(batchId);
        return { batchId, ideas: savedIdeas };
      }),

    /** List past idea batches for the current user */
    listBatches: protectedProcedure.query(async ({ ctx }) => {
      return listIdeaBatches(ctx.user.id);
    }),

    /** Get a specific batch with its ideas */
    getBatch: protectedProcedure
      .input(z.object({ batchId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const batch = await getIdeaBatchById(input.batchId);
        if (!batch) throw new TRPCError({ code: "NOT_FOUND" });
        if (batch.submittedById !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const batchIdeas = await getIdeasByBatchId(input.batchId);
        return { batch, ideas: batchIdeas };
      }),

    /** Add an idea to the job queue (creates a Job from the idea) */
    addToQueue: protectedProcedure
      .input(
        z.object({
          ideaId: z.number().int(),
          profile: z.enum(["aa_company", "david_personal"]),
          contentPillar: z.string().min(1),
          toneHint: z.string().optional(),
          targetAudience: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const idea = await (async () => {
          const { getDb } = await import("./db");
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const { ideas: ideasTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const result = await db.select().from(ideasTable).where(eq(ideasTable.id, input.ideaId)).limit(1);
          return result[0] ?? null;
        })();

        if (!idea) throw new TRPCError({ code: "NOT_FOUND" });
        if (idea.status === "queued") throw new TRPCError({ code: "BAD_REQUEST", message: "Already queued" });

        const requiredApprover: "danny" | "david" =
          input.profile === "david_personal" ? "david" : "danny";

        const jobResult = await createJob({
          submittedById: ctx.user.id,
          profile: input.profile,
          contentPillar: input.contentPillar,
          topic: idea.title + ": " + idea.description,
          toneHint: input.toneHint ?? null,
          targetAudience: input.targetAudience ?? null,
          requiredApprover,
          namedClientFlag: false,
          namedClientConfirmed: false,
        });

        const jobId = (jobResult as { insertId?: number })?.insertId ?? 0;

        await updateIdeaStatus(input.ideaId, "queued", jobId);

        await addAuditEntry({
          jobId,
          actor: ctx.user.name ?? ctx.user.openId,
          action: "idea_queued",
          details: { ideaId: input.ideaId, title: idea.title },
        });

        // Kick off generation pipeline
        const notionApiKey = process.env.NOTION_API_KEY ?? "";
        const appBaseUrl = process.env.APP_BASE_URL ?? "https://localhost:3000";
        runGenerationPipeline({ jobId, notionApiKey, appBaseUrl }).catch((err) =>
          console.error("[Pipeline] Idea queue generation error:", err)
        );

        return { success: true, jobId };
      }),

    /** Reject an idea */
    reject: protectedProcedure
      .input(z.object({ ideaId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await updateIdeaStatus(input.ideaId, "rejected");
        return { success: true };
      }),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────

  admin: router({
    /** List all users */
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllUsers();
    }),

    /** Update a user's role */
    setUserRole: protectedProcedure
      .input(z.object({ userId: z.number().int(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserRole(input.userId, input.role);
        await addAuditEntry({
          actor: ctx.user.name ?? ctx.user.openId,
          action: "user_role_updated",
          details: { targetUserId: input.userId, newRole: input.role },
        });
        return { success: true };
      }),

    /** Get approver config */
    getApproverConfig: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllApproverConfigs();
    }),

    /** Update approver email */
    updateApproverConfig: protectedProcedure
      .input(
        z.object({
          role: z.enum(["danny", "david"]),
          name: z.string().min(1),
          email: z.string().email(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateApproverConfig(input.role, input.name, input.email);
        await addAuditEntry({
          actor: ctx.user.name ?? ctx.user.openId,
          action: "approver_config_updated",
          details: { role: input.role, email: input.email },
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
