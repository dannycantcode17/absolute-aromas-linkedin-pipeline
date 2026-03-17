# Absolute Aromas LinkedIn Pipeline — TODO

## Phase 2: Database Schema & Data Models
- [x] Design and create DB schema: jobs, posts, guardrail_reviews, approval_tokens, audit_log, approver_config tables
- [x] Run Drizzle migration and apply SQL
- [x] Add DB query helpers in server/db.ts

## Phase 3: Backend — Generation & Guardrails
- [x] Notion style guide fetch helper (live, no cache, retry on failure) — server/notion.ts
- [x] Claude LLM generation with profile-specific system prompts (3-5 variants) — server/generation.ts
- [x] Guardrail validation: medical claims, competitor names, revenue figures, named clients, auto-publish triggers, superlatives
- [x] Pipeline orchestration service — server/pipeline.ts
- [x] Email notification helper — server/email.ts
- [x] tRPC procedures: jobs, posts, queue, audit, guardrails, admin — server/routers.ts

## Phase 4: Approval Workflow
- [x] Approval token system (secure, per-approver, time-limited)
- [x] tRPC procedures: approvePost, rejectPost, requestEdit
- [x] Re-generation on edit request with feedback context
- [x] Enforce David-only approval for personal page posts at server level

## Phase 5: Frontend
- [x] Brand palette CSS (index.css) — green/gold Absolute Aromas palette
- [x] App routing (App.tsx)
- [x] AppLayout sidebar component
- [x] Home landing page
- [x] SubmitJob form page (topic, profile, pillar, reference URL, named-client flag)
- [x] Dashboard page (all jobs with status)
- [x] JobDetailPage (job + post drafts)
- [x] ApprovalPage (approve / edit with feedback / reject)
- [x] QueuePage (ready-to-post + copy-to-clipboard + mark published)
- [x] HistoryPage (completed jobs + audit log)
- [x] AdminPage (guardrail review, user roles, approver config)

## Phase 6: Notion Audit Log & Role Management
- [x] Notion audit log sync service — server/notionAuditLog.ts
- [x] Role management: admin vs user access controls (enforced at server level)
- [x] Admin panel for role assignment

## Phase 7: Secrets, Tests, Polish
- [x] Wire NOTION_API_KEY and NOTION_AUDIT_DB_ID secrets
- [x] Vitest tests: guardrails (8 tests), auth/logout, role guards, pillar lookup — 17/17 passing
- [x] Final UI polish and mobile responsiveness check

## Phase 8: Documentation
- [x] Setup guide (API keys, Notion setup, first-run)
- [x] David's guide: how to submit and approve
- [x] Danny's guide: queue management, marking published
- [x] Style guide management notes

## V2 Improvements
- [x] Content calendar view on Queue page (monthly/weekly, posts plotted by suggested publish date)
- [x] Dashboard analytics strip (posts generated, approval rate, avg time-to-approval, flag rate)
- [x] Side-by-side variant comparison on Approval page (Compare / List toggle, character count, per-variant copy)
- [x] Publication confirmation flow: modal asking for LinkedIn post URL when marking published
- [x] Store linkedInUrl and publicationStatus on post record (schema migration applied)
- [x] Overdue badge on Queue cards (approved but not published after 7 days)
- [x] Seed approver config: Danny danny@absolute-aromas.com, David David@absolute-aromas.com
- [x] Add Harriet (Harriet@absolute-aromas.com) and Amy Klaire (AmyK@absolute-aromas.com) to admin panel team list

## V3 Features
- [x] Batch idea generator: tRPC procedure calls Claude to produce 10 content ideas from a topic/pillar prompt
- [x] IdeaGenerator page: user inputs topic + pillar, gets 10 ideas, can add to queue or reject each
- [x] Ideas stored in DB (idea_batches + ideas tables) with status: pending / queued / rejected
- [x] Add-to-queue action creates a Job from the idea and navigates to job detail
- [x] Dark mode restyle: charcoal background (#0f1117), layered cards (#1a1d27), cyan accent (#06b6d4)
- [x] Update index.css: full dark palette, cyan CSS variables, remove all green/gold
- [x] Restyle AppLayout sidebar: dark panel, cyan active state, muted inactive
- [x] Restyle all pages: Home, SubmitJob, Dashboard, JobDetailPage, ApprovalPage, QueuePage, HistoryPage, AdminPage
- [x] Restyle status badges: cyan/amber/red/grey pills
- [x] Restyle buttons: solid cyan primary, transparent cyan outline secondary, muted red destructive
