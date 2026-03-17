import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Submission Jobs ──────────────────────────────────────────────────────────
// A "job" is a content request submitted via the form.
// One job → multiple post drafts (variants).

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  submittedById: int("submittedById").notNull(), // FK → users.id
  /** "aa_company" | "david_personal" | "blog_post" */
  profile: mysqlEnum("profile", ["aa_company", "david_personal", "blog_post"]).notNull(),
  /** Content pillar from the style guide */
  contentPillar: varchar("contentPillar", { length: 128 }).notNull(),
  /** Free-text topic / idea / angle */
  topic: text("topic").notNull(),
  /** Optional reference URL provided by submitter */
  referenceUrl: text("referenceUrl"),
  /** If true, a secondary confirmation step is required before generation */
  namedClientFlag: boolean("namedClientFlag").default(false).notNull(),
  /** Confirmed that named client usage is intentional */
  namedClientConfirmed: boolean("namedClientConfirmed").default(false).notNull(),
  /** Target audience hint (optional) */
  targetAudience: text("targetAudience"),
  /** Tone hint (optional) */
  toneHint: text("toneHint"),
  // ─── Blog-specific fields (only populated when profile = "blog_post") ───
  /** Target keyword / SEO topic */
  blogKeyword: varchar("blogKeyword", { length: 255 }),
  /** Blog tone */
  blogTone: mysqlEnum("blogTone", ["educational", "thought_leadership", "story_driven"]),
  /** Target word count band */
  blogWordCount: mysqlEnum("blogWordCount", ["short", "standard", "long"]),
  /**
   * Job lifecycle:
   * pending_confirmation → waiting for named-client secondary confirmation
   * pending_style_guide  → Notion unreachable, queued for retry
   * generating           → Claude is running
   * pending_guardrail    → guardrail flags need manual review
   * pending_approval     → drafts sent to approver
   * approved             → one variant approved, in ready queue
   * rejected             → rejected by approver
   * published            → manually marked published
   */
  status: mysqlEnum("status", [
    "pending_confirmation",
    "pending_style_guide",
    "generating",
    "pending_guardrail",
    "pending_approval",
    "approved",
    "rejected",
    "published",
  ])
    .default("pending_style_guide")
    .notNull(),
  /** Which approver must approve this job — enforced server-side */
  requiredApprover: mysqlEnum("requiredApprover", ["danny", "david"]).notNull(),
  /** Snapshot of the style guide text used for this generation */
  styleGuideSnapshot: text("styleGuideSnapshot"),
  /** Number of generation attempts (for retry tracking) */
  generationAttempts: int("generationAttempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Post Drafts ─────────────────────────────────────────────────────────────
// Each job generates multiple variants. One variant gets approved.

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(), // FK → jobs.id
  /** Variant label: "A", "B", "C", "D", "E" */
  variantLabel: varchar("variantLabel", { length: 4 }).notNull(),
  /** The generated post text */
  content: text("content").notNull(),
  /** Generation iteration — increments on each edit/regenerate cycle */
  iteration: int("iteration").default(1).notNull(),
  /**
   * draft          → generated, not yet reviewed
   * flagged        → guardrail issue detected, held for review
   * pending_approval → sent to approver
   * approved       → approver accepted
   * rejected       → approver rejected
   * superseded     → replaced by a newer iteration
   */
  status: mysqlEnum("status", [
    "draft",
    "flagged",
    "pending_approval",
    "approved",
    "rejected",
    "superseded",
  ])
    .default("draft")
    .notNull(),
  /** Guardrail flags detected on this variant (JSON array of flag objects) */
  guardrailFlags: json("guardrailFlags").$type<GuardrailFlag[]>(),
  /** Approver who approved/rejected (must match job.requiredApprover) */
  approvedBy: varchar("approvedBy", { length: 64 }),
  approvedAt: timestamp("approvedAt"),
  /** Rejection reason if rejected */
  rejectionReason: text("rejectionReason"),
  /** Edit feedback from approver that triggered regeneration */
  editFeedback: text("editFeedback"),
  /** Suggested publish date set by approver */
  suggestedPublishDate: timestamp("suggestedPublishDate"),
  /** When the post was manually marked as published */
  publishedAt: timestamp("publishedAt"),
  /** Who marked it published */
  publishedBy: varchar("publishedBy", { length: 64 }),
  /** The live LinkedIn post URL — required to confirm actual publication */
  linkedInUrl: text("linkedInUrl"),
  /**
   * publication_status tracks whether the approved post has been confirmed live:
   * queued           → approved, not yet published
   * pending_confirm  → Mark Published clicked, awaiting LinkedIn URL entry
   * confirmed        → LinkedIn URL provided, post confirmed live
   */
  publicationStatus: mysqlEnum("publicationStatus", [
    "queued",
    "pending_confirm",
    "confirmed",
  ]).default("queued"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ─── Guardrail Flags ──────────────────────────────────────────────────────────
// Stored inline as JSON on posts, but also as a separate table for querying.

export type GuardrailFlag = {
  type:
    | "medical_claim"
    | "competitor_name"
    | "competitor_mention"
    | "revenue_figure"
    | "named_client"
    | "auto_publish_trigger"
    | "financial_projection"
    | "political_content"
    | "superlative_claim"
    | "tone_violation";
  severity: "block" | "warn";
  excerpt: string;
  description: string;
};

export const guardrailReviews = mysqlTable("guardrail_reviews", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(), // FK → posts.id
  flagType: varchar("flagType", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", ["block", "warn"]).notNull(),
  excerpt: text("excerpt").notNull(),
  description: text("description").notNull(),
  /** resolved = manually cleared by admin; auto_cleared = AI re-check passed */
  resolution: mysqlEnum("resolution", ["pending", "resolved", "auto_cleared"]).default("pending").notNull(),
  resolvedBy: varchar("resolvedBy", { length: 64 }),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GuardrailReview = typeof guardrailReviews.$inferSelect;

// ─── Approval Tokens ─────────────────────────────────────────────────────────
// Secure one-time tokens embedded in approval emails.

export const approvalTokens = mysqlTable("approval_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  jobId: int("jobId").notNull(),
  /** Which approver this token is valid for */
  approverRole: mysqlEnum("approverRole", ["danny", "david"]).notNull(),
  /** Whether the token has been consumed */
  used: boolean("used").default(false).notNull(),
  /** Token expires after 7 days */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalToken = typeof approvalTokens.$inferSelect;

// ─── Audit Log ────────────────────────────────────────────────────────────────
// Every state transition recorded here. Also synced to Notion.

export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId"),
  postId: int("postId"),
  /** Actor: user name or "system" */
  actor: varchar("actor", { length: 128 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  /** JSON payload with before/after state */
  details: json("details"),
  /** Whether this entry has been synced to Notion */
  notionSynced: boolean("notionSynced").default(false).notNull(),
  notionPageId: varchar("notionPageId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;

// ─── Approver Config ──────────────────────────────────────────────────────────
// Stores email addresses for Danny and David (admin-configurable).

export const approverConfig = mysqlTable("approver_config", {
  id: int("id").autoincrement().primaryKey(),
  approverRole: mysqlEnum("approverRole", ["danny", "david"]).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApproverConfig = typeof approverConfig.$inferSelect;

// ─── Idea Batches ─────────────────────────────────────────────────────────────
// A batch is generated when a user requests "give me 10 ideas".
// Each idea in the batch can be queued (turned into a Job) or rejected.

export const ideaBatches = mysqlTable("idea_batches", {
  id: int("id").autoincrement().primaryKey(),
  submittedById: int("submittedById").notNull(), // FK → users.id
  /** The prompt the user provided to seed the ideas */
  promptTopic: text("promptTopic").notNull(),
  /** Optional content pillar filter */
  contentPillar: varchar("contentPillar", { length: 128 }),
  /** Optional profile filter */
  profile: mysqlEnum("profile", ["aa_company", "david_personal", "both"]).default("both"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IdeaBatch = typeof ideaBatches.$inferSelect;
export type InsertIdeaBatch = typeof ideaBatches.$inferInsert;

export const ideas = mysqlTable("ideas", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(), // FK → idea_batches.id
  /** Short headline / hook for the idea */
  title: varchar("title", { length: 256 }).notNull(),
  /** 2-3 sentence description of the idea and angle */
  description: text("description").notNull(),
  /** Suggested content pillar */
  suggestedPillar: varchar("suggestedPillar", { length: 128 }),
  /** Suggested profile */
  suggestedProfile: mysqlEnum("suggestedProfile", ["aa_company", "david_personal", "blog_post"]),
  /** Why this idea fits the brand */
  rationale: text("rationale"),
  /**
   * pending  → not yet actioned
   * queued   → turned into a Job
   * rejected → dismissed by user
   */
  status: mysqlEnum("status", ["pending", "queued", "rejected"]).default("pending").notNull(),
  /** FK → jobs.id if queued */
  jobId: int("jobId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = typeof ideas.$inferInsert;

// ─── Style Guides ─────────────────────────────────────────────────────────────
// In-app editable style guides — one per content profile.
// Replaces the Notion style guide fetch for generation.

export const styleGuides = mysqlTable("style_guides", {
  id: int("id").autoincrement().primaryKey(),
  profile: mysqlEnum("profile", ["aa_company", "david_personal", "blog_post"]).notNull().unique(),
  content: text("content").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StyleGuide = typeof styleGuides.$inferSelect;
export type InsertStyleGuide = typeof styleGuides.$inferInsert;

// ─── Guardrail Config ─────────────────────────────────────────────────────────
// Admin-editable lists of blocked terms and flagged claim types.
// Replaces hardcoded patterns in notion.ts.

export const guardrailConfig = mysqlTable("guardrail_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Newline-separated list of competitor names to block */
  competitorNames: text("competitorNames").notNull().default(""),
  /** Newline-separated list of banned phrase patterns */
  bannedPhrases: text("bannedPhrases").notNull().default(""),
  /** Newline-separated list of flagged claim types (medical, financial, superlative) */
  flaggedClaimTypes: text("flaggedClaimTypes").notNull().default("medical,financial,superlative"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GuardrailConfig = typeof guardrailConfig.$inferSelect;

// ─── Posting Rhythm ───────────────────────────────────────────────────────────
// Target posts per week per profile — informational, used for on-track indicators.

export const postingRhythm = mysqlTable("posting_rhythm", {
  id: int("id").autoincrement().primaryKey(),
  profile: mysqlEnum("profile", ["aa_company", "david_personal", "blog_post"]).notNull().unique(),
  targetPerWeek: int("targetPerWeek").notNull().default(2),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostingRhythm = typeof postingRhythm.$inferSelect;
