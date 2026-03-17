# Absolute Aromas LinkedIn Content Pipeline — Documentation

**Version 1.0 · March 2026**

---

## Overview

The Absolute Aromas LinkedIn Content Pipeline is an internal web application that streamlines the creation, review, and manual publication of LinkedIn posts for two distinct profiles: the **Absolute Aromas Company Page** and **David Tomlinson's Personal Page**. It enforces brand compliance at every step, ensures all content is human-approved before publication, and maintains a permanent audit trail in Notion.

The system is deliberately designed with one hard constraint: **it never publishes to LinkedIn automatically**. Every post must be copied manually by an approver and pasted into LinkedIn. This is an architectural guarantee, not a setting.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [First-Time Setup Guide](#2-first-time-setup-guide)
3. [User Roles and Access](#3-user-roles-and-access)
4. [Submitting a Content Idea](#4-submitting-a-content-idea)
5. [Approval Workflow — David's Guide](#5-approval-workflow--davids-guide)
6. [Approval Workflow — Danny's Guide](#6-approval-workflow--dannys-guide)
7. [Ready-to-Post Queue](#7-ready-to-post-queue)
8. [Guardrail System](#8-guardrail-system)
9. [Notion Integration](#9-notion-integration)
10. [Managing the Style Guide](#10-managing-the-style-guide)
11. [Admin Panel Reference](#11-admin-panel-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. System Architecture

The pipeline follows a strict linear flow that cannot be short-circuited:

```
Content Idea Submitted
        ↓
Style Guide Fetched Live from Notion
        ↓
Claude AI Generates 3–5 Post Variants
        ↓
Guardrail Validation (8 checks, server-enforced)
        ↓
Routed to Correct Approver (David or Danny)
        ↓
Approver: Approve / Edit / Reject
        ↓
Ready-to-Post Queue (copy-to-clipboard only)
        ↓
Manual Paste into LinkedIn by Approver
        ↓
Mark as Published → Notion Audit Log Updated
```

### Profile Routing Rules

| Profile | Required Approver | LinkedIn Destination |
|---|---|---|
| AA Company Page | Danny (default) or David | [Absolute Aromas Company Page](https://www.linkedin.com/company/absolute-aromas/) |
| David Personal Page | David only (enforced server-side) | David's personal LinkedIn profile |

The routing rule for David's personal page is enforced at the database and API level. Even if someone attempts to approve a David Personal post while logged in as Danny, the server will reject the action with a permission error.

---

## 2. First-Time Setup Guide

### Prerequisites

Before the application can be used, the following must be configured by an admin:

**Step 1 — Notion Integration Token**

Navigate to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new integration called "Absolute Aromas LinkedIn Pipeline". Copy the token (it begins with `secret_`) and add it to the application secrets as `NOTION_API_KEY`.

The integration must be shared with two Notion pages:
- The **Absolute Aromas LinkedIn Writing Style Guide** page (the system fetches this live for every generation)
- The **LinkedIn Post Audit Log** database (the system writes to this after every state transition)

To share: open each page in Notion, click the `···` menu → **Connections** → select your integration.

**Step 2 — Notion Audit Log Database**

Create a new Notion database called "LinkedIn Post Audit Log" with the following properties:

| Property Name | Type |
|---|---|
| Topic | Title |
| Job ID | Number |
| Post ID | Number |
| Profile | Select (options: AA Company Page, David Personal Page) |
| Content Pillar | Rich Text |
| Action | Select |
| Actor | Rich Text |
| Approver | Rich Text |
| Timestamp | Date |

Copy the database ID from the URL (the 32-character string before the `?v=` parameter) and add it as `NOTION_AUDIT_DB_ID`.

**Step 3 — Approver Email Addresses**

Log in as an admin, navigate to **Admin → Approver Config**, and enter the correct email addresses for David and Danny. These are used for approval notification emails.

**Step 4 — Promote David and Danny to Admin**

After David and Danny first sign in, navigate to **Admin → Users** and set their roles to `admin`. Standard users can only submit ideas; admins can access the approval queue, admin panel, and ready-to-post queue.

---

## 3. User Roles and Access

The system has two roles:

| Role | Access |
|---|---|
| **User** | Submit content ideas, view their own submitted jobs |
| **Admin** | Everything above, plus: approval queue, ready-to-post queue, post history, guardrail review, user management, approver config |

David and Danny should both be set to `admin`. Anyone else who submits ideas (e.g., marketing team members) should remain as `user`.

---

## 4. Submitting a Content Idea

Any logged-in user can submit a content idea. Navigate to **Submit an Idea** from the sidebar or home page.

### Form Fields

**LinkedIn Profile** — Choose which profile this post is for. AA Company Page posts can be approved by either David or Danny. David Personal Page posts can only be approved by David.

**Content Pillar** — Select the strategic pillar that best fits the idea. Pillars are defined in the style guide and differ by profile:

*AA Company Page pillars:* Manufacturer Authority, Private Label Education, Sustainability & Ethics, Industry Trends, Behind the Scenes, Customer Success (anonymised), Product Innovation.

*David Personal Page pillars:* Founder Perspective, Industry Insider, Lessons Learned, Sustainability Champion, Team & Culture, Personal Reflection.

**Topic / Idea** — Describe the post idea in plain language. Be specific: instead of "write about lavender", write "how our GC-MS testing process catches adulterated lavender oil before it reaches private label clients". The more specific the brief, the better the generated variants.

**Target Audience** (optional) — Who is this post primarily for? Examples: "private label buyers", "aromatherapy practitioners", "sustainability-focused procurement managers".

**Tone Hint** (optional) — Any specific tone guidance beyond the style guide defaults. Examples: "more personal and reflective", "authoritative and data-driven", "warm and conversational".

**Reference URL** (optional) — A URL to an article, study, or resource that should inform the post content.

**Named Client Flag** — Check this box only if the post will explicitly name a specific client company. This triggers a secondary confirmation step and a guardrail check. Client names must never appear in posts without prior written permission from that client.

### After Submission

The system immediately fetches the live style guide from Notion, generates 3–5 post variants using Claude AI, runs all guardrail checks, and routes the job to the appropriate approver. The entire process typically takes 20–40 seconds. You can track the job status on the **Dashboard**.

---

## 5. Approval Workflow — David's Guide

David receives email notifications when posts are ready for his review. He can also check the **Dashboard** at any time for jobs with `pending_approval` status.

### Reviewing Drafts

Navigate to a job from the Dashboard and click **Review & Approve**. You will see 3–5 draft variants side by side. Each variant shows:

- The full post text
- Any guardrail warnings (amber) — these do not block approval but should be reviewed
- The variant label (A, B, C, D, E)

### Approval Actions

**Approve** — Select a variant and click Approve. You may optionally set a suggested publish date. The post moves to the Ready-to-Post Queue immediately.

**Edit / Request Regeneration** — If none of the variants are right, click Edit on any variant and provide specific feedback. Examples of useful feedback:
- "Too formal — needs to sound more like me, conversational and direct"
- "Remove the reference to GC-MS in the opening, lead with the customer benefit instead"
- "Shorten to under 150 words"

The system will regenerate that variant using your feedback as additional context. You can iterate as many times as needed.

**Reject** — If the entire job should be abandoned, click Reject and provide a reason. The job is archived and the submitter is notified. No post is published.

### David-Only Posts

Posts for the **David Personal Page** can only be approved by David. If you see a Personal Page job in the queue, only your approval action will be accepted by the server. This is enforced at the API level, not just the UI.

---

## 6. Approval Workflow — Danny's Guide

Danny's workflow is identical to David's for **AA Company Page** posts. Danny does not have approval authority over David Personal Page posts — the server will reject any such attempt.

### Queue Management

Danny is the primary manager of the Ready-to-Post Queue for the company page. After approving posts, Danny is responsible for:

1. Copying the approved post text from the Queue page
2. Navigating to the [Absolute Aromas LinkedIn Company Page](https://www.linkedin.com/company/absolute-aromas/)
3. Pasting the text into a new post
4. Publishing manually on LinkedIn
5. Returning to the Queue page and clicking **Mark as Published**

Marking as published updates the database record, writes the final entry to the Notion audit log, and moves the post to the "Recently Published" section.

---

## 7. Ready-to-Post Queue

The Ready-to-Post Queue (accessible from the sidebar) shows all approved posts awaiting manual publication. Each card displays:

- The full approved post text
- The profile (AA Company or David Personal)
- The content pillar and topic
- Who approved it and when
- The suggested publish date (if set by the approver)
- A **Copy** button that copies the text to clipboard with a confirmation toast
- An **Open LinkedIn** button that opens the correct LinkedIn profile in a new tab
- A **Mark as Published** button

The queue is intentionally minimal. There is no scheduling, no direct LinkedIn API connection, and no automated posting of any kind. The copy-to-clipboard action is the only way to get content out of the system.

---

## 8. Guardrail System

Every generated post variant is automatically checked against eight guardrail rules before being sent to an approver. Rules marked **BLOCK** prevent the post from reaching the approval queue until resolved by an admin. Rules marked **WARN** surface to the approver as advisory flags but do not block approval.

| Rule | Severity | Description |
|---|---|---|
| Medical / therapeutic claims | BLOCK | Detects language like "cures", "treats", "relieves anxiety", "clinical proof". Violates UK/EU advertising regulations. |
| Competitor names | BLOCK | Detects named competitors (doTERRA, Young Living, Tisserand, Neal's Yard, etc.). |
| Revenue figures | BLOCK | Detects specific monetary values, turnover figures, or revenue statements. |
| Financial projections | BLOCK | Detects forward-looking financial statements. |
| Auto-publish triggers | BLOCK | Defence-in-depth: detects language like "automatically published" or "post to LinkedIn". |
| Named client (flag not set) | BLOCK | Detects company names when the Named Client Flag was not checked at submission. |
| Superlative claims | WARN | Detects unsubstantiated claims like "world's best", "industry leader", "#1". |
| Political content | WARN | Detects references to political parties, elections, or government policy. |

Blocking flags are visible in **Admin → Guardrail Review**. An admin can resolve a flag (mark it as a false positive) to allow the post to proceed to the approval queue.

---

## 9. Notion Integration

The system uses Notion for two purposes:

**Style Guide Fetch** — Every time a job is submitted, the system fetches the live content of the Absolute Aromas LinkedIn Writing Style Guide page from Notion. This means any edits to the style guide in Notion take effect on the very next generation — no restart or cache clearing required.

If Notion is unreachable at submission time, the job enters `pending_style_guide` status and can be retried once Notion is available again.

**Audit Log Sync** — Every significant state transition is written to the Notion audit log database as a new page. This includes: job submitted, generation completed, guardrail flag raised, approval routing, post approved, post rejected, edit requested, and post marked published.

The Notion sync is best-effort: if it fails for any reason, the event is still recorded in the application's own database and the workflow continues uninterrupted. The Notion sync failure is logged but does not block any action.

---

## 10. Managing the Style Guide

The style guide lives in Notion and is the single source of truth for all AI generation. To update it:

1. Open the **Absolute Aromas LinkedIn Writing Style Guide** page in Notion
2. Make your edits directly — add new pillars, update tone guidance, add examples, or refine the brand voice section
3. Ensure the Notion integration has access to the page (check via `···` → Connections)

Changes take effect immediately on the next job submission. There is no need to update the application.

### What the Style Guide Should Contain

The style guide is most effective when it includes:

- **Brand voice principles** — specific adjectives and descriptions of the Absolute Aromas tone (e.g., "authoritative but accessible", "never promotional")
- **Content pillars** — the strategic themes for each profile, with examples of good and bad topics
- **Vocabulary guidance** — preferred terms and terms to avoid
- **Post structure guidance** — how posts should open, how to use line breaks, hashtag policy
- **Compliance reminders** — what claims are never permitted, client confidentiality rules
- **Examples** — 2–3 example posts per pillar that represent the ideal output

---

## 11. Admin Panel Reference

The Admin Panel (accessible to admins from the sidebar) has three tabs:

**Guardrail Review** — Lists all posts with unresolved blocking guardrail flags. Each flag shows the flag type, severity, the offending excerpt, and a Resolve button. Resolving a flag marks it as a false positive and allows the post to proceed to the approval queue.

**Users** — Lists all registered users with their current role. Use the dropdown to promote a user to `admin` or demote them to `user`. Changes take effect immediately.

**Approver Config** — Stores the display name and email address for David and Danny. These are used in approval notification emails. Update these if email addresses change.

---

## 12. Troubleshooting

**"Notion unavailable" error on submission**
The system cannot reach the Notion API. Check that the `NOTION_API_KEY` secret is correctly set and that the integration has been shared with the style guide page. The job will be saved in `pending_style_guide` status and can be retried.

**Post stuck in "generating" status**
The Claude AI generation is taking longer than expected or encountered an error. Check the server logs. The job can be retried from the Dashboard.

**Guardrail flag on a clearly acceptable post**
Navigate to Admin → Guardrail Review, review the flag, and click Resolve if it is a false positive. The post will then proceed to the approval queue.

**"You are not authorised to approve this post" error**
You are attempting to approve a David Personal Page post while logged in as Danny, or vice versa. Only David can approve his personal page posts. This is enforced at the server level and cannot be overridden from the UI.

**Notion audit log not receiving entries**
Check that `NOTION_AUDIT_DB_ID` is correctly set and that the integration has been shared with the audit log database. The application will continue to function normally — the local database always records all events regardless of Notion sync status.

**Email notifications not arriving**
Check the approver email addresses in Admin → Approver Config. The system uses the built-in notification service; ensure the application is correctly deployed and the notification service is active.

---

*This documentation covers version 1.0 of the Absolute Aromas LinkedIn Content Pipeline. For support or feature requests, contact the system administrator.*
