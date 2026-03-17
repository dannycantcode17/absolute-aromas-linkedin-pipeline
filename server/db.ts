import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  approvalTokens,
  approverConfig,
  auditLog,
  guardrailReviews,
  InsertUser,
  jobs,
  posts,
  users,
  type GuardrailFlag,
  type InsertJob,
  type InsertPost,
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

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(posts).values(data);
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

export async function createApprovalToken(
  jobId: number,
  approverRole: "danny" | "david",
  token: string
) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(approvalTokens).values({ token, jobId, approverRole, expiresAt });
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
