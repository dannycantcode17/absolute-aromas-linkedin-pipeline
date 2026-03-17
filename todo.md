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

## V4 Fixes & Improvements
- [x] Bug: Wire Resend email API (install resend package, add RESEND_API_KEY secret, update email.ts)
- [x] Bug: Approver name on dashboard reads live from approver_config, not stale at job creation
- [x] Bug: Guardrail Review sidebar nav routes to /guardrails (standalone page, not /admin)
- [x] Dashboard: Replace stats row with Posts This Week, In Queue, Awaiting Approval, Avg Posts/Week
- [x] Dashboard: Pillar distribution chart (bar/donut, published posts only, hidden if no history)
- [x] Dashboard: Monthly posting calendar (cyan = AA, amber = David, split = both, today border)
- [x] UX: Workflow prompt on Dashboard — "n posts awaiting approval" and "n posts ready to publish"
- [x] UX: Nav badges on sidebar (awaiting approval count, guardrail review count)
- [x] UX: Submit Post confirmation message after submission (full success screen with 'what happens next')
- [x] UX: Collapsible how-to panel on SubmitJob page (5-step workflow explanation)
- [x] Email: Inline post drafts in approval email HTML
- [x] Email: One-click token approve button in email (no login required)
- [x] Email: Profile-distinct subject lines ([David's Posts] vs [AA Posts])
- [x] Email: Mobile-friendly large approve button
- [x] Post History: Remove audit log from UI (kept in DB), show only published posts clean list

## V5 — Blog Post Content Type + In-App Style Guide Config

### Schema Changes
- [x] Add `blog_post` to `jobs.profile` enum (migration)
- [x] Add `blogKeyword`, `blogTone`, `blogWordCount` columns to `jobs` table (migration)
- [x] Create `style_guides` table: id, profile, content, updatedAt (migration)
- [x] Create `guardrail_config` table: id, competitorNames, bannedPhrases, flaggedClaimTypes, updatedAt (migration)
- [x] Create `posting_rhythm` table: id, profile, targetPerWeek, updatedAt (migration)
- [ ] Seed style_guides with current Notion content (AA, David, Blog defaults) — admin can do via Settings page
- [ ] Seed guardrail_config with current hardcoded patterns from notion.ts — admin can do via Settings page

### Backend — Style Guide Migration (Update 2)
- [x] Remove Notion style guide fetch from generation pipeline (keep audit log sync)
- [x] Generation service reads style guide from DB style_guides table
- [x] Graceful error if style guide not configured: "Style guide not configured — go to Admin → Settings"
- [x] DB helpers: getStyleGuide, upsertStyleGuide, getGuardrailConfig, upsertGuardrailConfig, getPostingRhythm, upsertPostingRhythm
- [x] tRPC procedures: settings.listStyleGuides, settings.upsertStyleGuide, settings.getGuardrailConfig, settings.updateGuardrailConfig, settings.listPostingRhythm, settings.upsertPostingRhythm

### Backend — Blog Post Generation (Update 1)
- [x] Blog-specific system prompt: structured output (Title, Meta description 155 chars, H2 body, suggested internal links, suggested tags)
- [x] Blog generation produces exactly 2 variants
- [x] Guardrails apply identically to blog posts
- [x] Blog approver always routes to Danny (same as AA Company Page)
- [x] generation.ts handles blog_post profile with separate prompt path

### Admin Settings Page (Update 2)
- [x] Admin → Settings page with 5 tabs: Style Guides / Guardrails / Approvers / Posting Rhythm / Users
- [x] Style Guides tab: 3 rich text areas (AA / David / Blog), save per guide, last updated timestamp
- [x] Guardrails tab: editable competitor names list, banned phrases list, flagged claim types
- [x] Approvers tab: moved from current location, Danny (AA + Blog), David (personal only)
- [x] Posting Rhythm tab: target posts/week per profile, on-track indicator on dashboard

### Frontend — Blog Post UX (Update 1)
- [x] Submission form: "Blog Post" as third option in Content Profile selector
- [x] Blog-specific fields shown when Blog Post selected: keyword, tone dropdown, word count dropdown
- [ ] Queue page: "Type" badge distinguishing LinkedIn AA / LinkedIn David / Blog
- [ ] Dashboard calendar: purple/violet colour for Blog posts (third colour)
- [ ] Dashboard pillar chart: separate LinkedIn vs Blog post types
- [ ] Post History: "Blog" type badge, "View full post" expand showing title + meta + body

## V5 Bug Fix
- [x] Bug: Live database missing v5 schema migrations — applied all missing columns and tables directly to production DB (blogKeyword, blogTone, blogWordCount, blog_post enum, style_guides, guardrail_config, posting_rhythm, idea_batches, ideas tables)
