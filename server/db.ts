import { and, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  approvalTokens,
  approverConfig,
  auditLog,
  guardrailConfig,
  guardrailReviews,
  ideaBatches,
  ideas,
  imageGuidelines,
  InsertUser,
  jobs,
  postingRhythm,
  posts,
  styleGuides,
  users,
  type GuardrailFlag,
  type InsertJob,
  type InsertPost,
  type InsertIdeaBatch,
  type InsertIdea,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Approver Config ──────────────────────────────────────────────────────────

export async function getApproverConfig(role: "danny" | "david") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(approverConfig).where(eq(approverConfig.approverRole, role)).limit(1);
  return result[0] ?? null;
}

export async function getAllApproverConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(approverConfig);
}

export async function updateApproverConfig(role: "danny" | "david", name: string, email: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(approverConfig).set({ name, email }).where(eq(approverConfig.approverRole, role));
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobs).values(data);
  return result[0];
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateJobStatus(
  id: number,
  status: typeof jobs.$inferSelect["status"],
  extra?: Partial<typeof jobs.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set({ status, ...extra }).where(eq(jobs.id, id));
}

export async function listJobs(filters?: {
  status?: typeof jobs.$inferSelect["status"][];
  profile?: "aa_company" | "david_personal";
  submittedById?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status?.length) conditions.push(inArray(jobs.status, filters.status));
  if (filters?.profile) conditions.push(eq(jobs.profile, filters.profile));
  if (filters?.submittedById) conditions.push(eq(jobs.submittedById, filters.submittedById));
  const query = db.select().from(jobs);
  if (conditions.length) return query.where(and(...conditions)).orderBy(desc(jobs.createdAt));
  return query.orderBy(desc(jobs.createdAt));
}

export async function getPendingStyleGuideJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.status, "pending_style_guide")).orderBy(jobs.createdAt);
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(data: InsertPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(posts).values(data);
  return (result[0] as { insertId?: number })?.insertId ?? 0;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getPostsByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.jobId, jobId)).orderBy(posts.variantLabel, posts.iteration);
}

export async function getActivePostsByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.jobId, jobId), inArray(posts.status, ["draft", "flagged", "pending_approval"])))
    .orderBy(posts.variantLabel);
}

export async function updatePostStatus(
  id: number,
  status: typeof posts.$inferSelect["status"],
  extra?: Partial<typeof posts.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ status, ...extra }).where(eq(posts.id, id));
}

export async function getReadyToPostQueue() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ post: posts, job: jobs })
    .from(posts)
    .innerJoin(jobs, eq(posts.jobId, jobs.id))
    .where(eq(posts.status, "approved"))
    .orderBy(desc(posts.approvedAt));
}

export async function markPostPublished(postId: number, publishedBy: string, linkedInUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(posts)
    .set({
      publishedAt: new Date(),
      publishedBy,
      linkedInUrl,
      publicationStatus: "confirmed",
      status: "approved",
    })
    .where(eq(posts.id, postId));
}

export async function supersedePreviousIterations(jobId: number, currentIteration: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(posts)
    .set({ status: "superseded" })
    .where(
      and(
        eq(posts.jobId, jobId),
        inArray(posts.status, ["draft", "flagged", "pending_approval"]),
      )
    );
}

// ─── Guardrail Reviews ────────────────────────────────────────────────────────

export async function createGuardrailReviews(postId: number, flags: GuardrailFlag[]) {
  const db = await getDb();
  if (!db) return;
  if (!flags.length) return;
  await db.insert(guardrailReviews).values(
    flags.map((f) => ({
      postId,
      flagType: f.type,
      severity: f.severity,
      excerpt: f.excerpt,
      description: f.description,
    }))
  );
}

export async function getPendingGuardrailReviews() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ review: guardrailReviews, post: posts, job: jobs })
    .from(guardrailReviews)
    .innerJoin(posts, eq(guardrailReviews.postId, posts.id))
    .innerJoin(jobs, eq(posts.jobId, jobs.id))
    .where(eq(guardrailReviews.resolution, "pending"))
    .orderBy(desc(guardrailReviews.createdAt));
}

export async function resolveGuardrailReview(id: number, resolvedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(guardrailReviews)
    .set({ resolution: "resolved", resolvedBy, resolvedAt: new Date() })
    .where(eq(guardrailReviews.id, id));
}

// ─── Approval Tokens ──────────────────────────────────────────────────────────

export async function createApprovalToken(data: {
  token: string;
  jobId: number;
  approverRole: "danny" | "david";
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(approvalTokens).values(data);
}

export async function getApprovalToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(approvalTokens).where(eq(approvalTokens.token, token)).limit(1);
  return result[0] ?? null;
}

export async function consumeApprovalToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(approvalTokens).set({ used: true }).where(eq(approvalTokens.token, token));
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function addAuditEntry(entry: {
  jobId?: number;
  postId?: number;
  actor: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({
    jobId: entry.jobId ?? null,
    postId: entry.postId ?? null,
    actor: entry.actor,
    action: entry.action,
    details: entry.details ?? null,
    notionSynced: false,
  });
}

export async function getAuditLog(jobId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (jobId) {
    return db.select().from(auditLog).where(eq(auditLog.jobId, jobId)).orderBy(auditLog.createdAt);
  }
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);
}

export async function getQueueAnalytics() {
  const db = await getDb();
  if (!db) return { totalGenerated: 0, approvalRate: 0, avgHoursToApproval: 0, flagRate: 0, queueCount: 0, publishedCount: 0 };

  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(500);
  const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(500);

  const totalGenerated = allJobs.length;
  const approvedJobs = allJobs.filter((j) => j.status === "approved" || j.status === "published");
  const rejectedJobs = allJobs.filter((j) => j.status === "rejected");
  const approvalRate = totalGenerated > 0
    ? Math.round((approvedJobs.length / Math.max(approvedJobs.length + rejectedJobs.length, 1)) * 100)
    : 0;

  // Average hours from job creation to post approval
  const approvedPosts = allPosts.filter((p) => p.status === "approved" && p.approvedAt);
  const avgHoursToApproval = approvedPosts.length > 0
    ? Math.round(
        approvedPosts.reduce((sum, p) => {
          const job = allJobs.find((j) => j.id === p.jobId);
          if (!job || !p.approvedAt) return sum;
          return sum + (p.approvedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / approvedPosts.length
      )
    : 0;

  // Flag rate: jobs that hit pending_guardrail at some point
  const flaggedPosts = allPosts.filter((p) => p.status === "flagged" || (p.guardrailFlags && (p.guardrailFlags as unknown[]).length > 0));
  const flagRate = totalGenerated > 0 ? Math.round((flaggedPosts.length / Math.max(allPosts.length, 1)) * 100) : 0;

  const queueCount = allPosts.filter((p) => p.status === "approved" && !p.publishedAt).length;
  const publishedCount = allPosts.filter((p) => p.publicationStatus === "confirmed").length;

  return { totalGenerated, approvalRate, avgHoursToApproval, flagRate, queueCount, publishedCount };
}

// ─── Idea Batches ─────────────────────────────────────────────────────────────

export async function createIdeaBatch(data: InsertIdeaBatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ideaBatches).values(data);
  return result[0];
}

export async function createIdeas(items: InsertIdea[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!items.length) return;
  await db.insert(ideas).values(items);
}

export async function getIdeaBatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(ideaBatches).where(eq(ideaBatches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getIdeasByBatchId(batchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideas).where(eq(ideas.batchId, batchId)).orderBy(ideas.id);
}

export async function listIdeaBatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideaBatches).where(eq(ideaBatches.submittedById, userId)).orderBy(desc(ideaBatches.createdAt)).limit(50);
}

export async function updateIdeaStatus(
  ideaId: number,
  status: "pending" | "queued" | "rejected",
  jobId?: number
) {
  const db = await getDb();
  if (!db) return;
  await db.update(ideas).set({ status, ...(jobId ? { jobId } : {}) }).where(eq(ideas.id, ideaId));
}

export async function getUnsyncedAuditEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLog).where(eq(auditLog.notionSynced, false)).orderBy(auditLog.createdAt).limit(50);
}

export async function markAuditEntrySynced(id: number, notionPageId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(auditLog).set({ notionSynced: true, notionPageId }).where(eq(auditLog.id, id));
}

// ─── Dashboard Stats (v4 redesign) ───────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  const empty = {
    postsThisWeek: 0, inQueue: 0, awaitingApproval: 0, avgPostsPerWeek: 0,
    pillarDistribution: [] as { pillar: string; count: number }[],
    calendarData: [] as { date: string; aaCount: number; davidCount: number; blogCount: number }[],
    pendingApprovalJobIds: [] as number[],
  };
  if (!db) return empty;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const allPosts = await db.select().from(posts);

  const postsThisWeek = allPosts.filter(
    (p) => p.publicationStatus === "confirmed" && p.publishedAt && p.publishedAt >= startOfWeek
  ).length;

  const inQueue = allPosts.filter((p) => p.status === "approved" && !p.publishedAt).length;

  const awaitingApprovalJobs = allJobs.filter((j) => j.status === "pending_approval");
  const awaitingApproval = awaitingApprovalJobs.length;
  const pendingApprovalJobIds = awaitingApprovalJobs.map((j) => j.id);

  const publishedLast4Weeks = allPosts.filter(
    (p) => p.publicationStatus === "confirmed" && p.publishedAt && p.publishedAt >= fourWeeksAgo
  );
  const avgPostsPerWeek = Math.round((publishedLast4Weeks.length / 4) * 10) / 10;

  // Pillar distribution (published posts only)
  const publishedPosts = allPosts.filter((p) => p.publicationStatus === "confirmed");
  const pillarMap: Record<string, number> = {};
  for (const post of publishedPosts) {
    const job = allJobs.find((j) => j.id === post.jobId);
    if (job?.contentPillar) {
      pillarMap[job.contentPillar] = (pillarMap[job.contentPillar] ?? 0) + 1;
    }
  }
  const pillarDistribution = Object.entries(pillarMap)
    .map(([pillar, count]) => ({ pillar, count }))
    .sort((a, b) => b.count - a.count);

  // Calendar data: published posts grouped by date and profile (last 90 days)
  const recentPublished = allPosts.filter(
    (p) => p.publicationStatus === "confirmed" && p.publishedAt && p.publishedAt >= ninetyDaysAgo
  );
  const calendarMap: Record<string, { aaCount: number; davidCount: number; blogCount: number }> = {};
  for (const post of recentPublished) {
    if (!post.publishedAt) continue;
    const dateKey = post.publishedAt.toISOString().slice(0, 10);
    const job = allJobs.find((j) => j.id === post.jobId);
    if (!calendarMap[dateKey]) calendarMap[dateKey] = { aaCount: 0, davidCount: 0, blogCount: 0 };
    if (job?.profile === "aa_company") calendarMap[dateKey].aaCount++;
    else if (job?.profile === "david_personal") calendarMap[dateKey].davidCount++;
    else if (job?.profile === "blog_post") calendarMap[dateKey].blogCount++;
  }
  const calendarData = Object.entries(calendarMap).map(([date, counts]) => ({ date, ...counts }));

  return { postsThisWeek, inQueue, awaitingApproval, avgPostsPerWeek, pillarDistribution, calendarData, pendingApprovalJobIds };
}

// ─── Published posts for History page (v4 simplified) ────────────────────────

export async function getPublishedPosts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: posts.id,
      jobId: posts.jobId,
      content: posts.content,
      variantLabel: posts.variantLabel,
      publishedAt: posts.publishedAt,
      linkedInUrl: posts.linkedInUrl,
      approvedBy: posts.approvedBy,
      profile: jobs.profile,
      contentPillar: jobs.contentPillar,
      topic: jobs.topic,
    })
    .from(posts)
    .innerJoin(jobs, eq(posts.jobId, jobs.id))
    .where(eq(posts.publicationStatus, "confirmed"))
    .orderBy(desc(posts.publishedAt))
    .limit(200);
}

// ─── Style Guides (v5) ────────────────────────────────────────────────────────

export async function getStyleGuideForProfile(profile: "aa_company" | "david_personal" | "blog_post") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(styleGuides).where(eq(styleGuides.profile, profile)).limit(1);
  return result[0] ?? null;
}

export async function getAllStyleGuides() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(styleGuides).orderBy(styleGuides.profile);
}

export async function upsertStyleGuide(profile: "aa_company" | "david_personal" | "blog_post", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(styleGuides).values({ profile, content }).onDuplicateKeyUpdate({ set: { content } });
}

// ─── Guardrail Config (v5) ────────────────────────────────────────────────────

export async function getGuardrailConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(guardrailConfig).limit(1);
  return result[0] ?? null;
}

export async function upsertGuardrailConfig(data: { competitorNames: string; bannedPhrases: string; flaggedClaimTypes: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getGuardrailConfig();
  if (existing) {
    await db.update(guardrailConfig).set({ ...data }).where(eq(guardrailConfig.id, existing.id));
  } else {
    await db.insert(guardrailConfig).values(data);
  }
}

// ─── Posting Rhythm (v5) ──────────────────────────────────────────────────────

export async function getAllPostingRhythm() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postingRhythm).orderBy(postingRhythm.profile);
}

export async function upsertPostingRhythm(profile: "aa_company" | "david_personal" | "blog_post", targetPerWeek: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(postingRhythm).values({ profile, targetPerWeek }).onDuplicateKeyUpdate({ set: { targetPerWeek } });
}

// ─── Image Guidelines (v6) ────────────────────────────────────────────────────

export async function getImageGuidelineForProfile(profile: "aa_company" | "david_personal" | "blog_post") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(imageGuidelines).where(eq(imageGuidelines.profile, profile)).limit(1);
  return result[0] ?? null;
}

export async function getAllImageGuidelines() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(imageGuidelines).orderBy(imageGuidelines.profile);
}

export async function upsertImageGuideline(profile: "aa_company" | "david_personal" | "blog_post", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(imageGuidelines).values({ profile, content }).onDuplicateKeyUpdate({ set: { content } });
}

// ─── Saved Ideas (v6) ─────────────────────────────────────────────────────────

/** Mark an idea as saved (set savedAt timestamp) */
export async function saveIdea(ideaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ideas).set({ savedAt: new Date() }).where(eq(ideas.id, ideaId));
}

/** List all saved (pending) ideas for a user — sorted by savedAt desc */
export async function listSavedIdeas(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: ideas.id,
      batchId: ideas.batchId,
      title: ideas.title,
      description: ideas.description,
      suggestedPillar: ideas.suggestedPillar,
      suggestedProfile: ideas.suggestedProfile,
      rationale: ideas.rationale,
      status: ideas.status,
      jobId: ideas.jobId,
      savedAt: ideas.savedAt,
      createdAt: ideas.createdAt,
    })
    .from(ideas)
    .innerJoin(ideaBatches, eq(ideas.batchId, ideaBatches.id))
    .where(
      and(
        eq(ideaBatches.submittedById, userId),
        isNotNull(ideas.savedAt),
        eq(ideas.status, "pending")
      )
    )
    .orderBy(desc(ideas.savedAt));
}

// ─── Jobs with live approver names (fixes stale name bug) ────────────────────

export async function getJobsWithLiveApproverNames() {
  const db = await getDb();
  if (!db) return [];
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(100);
  const configs = await db.select().from(approverConfig);
  const configMap: Record<string, string> = {};
  for (const c of configs) {
    configMap[c.approverRole] = c.name;
  }
  return allJobs.map((j) => ({
    ...j,
    approverName: configMap[j.requiredApprover] ?? j.requiredApprover,
  }));
}
