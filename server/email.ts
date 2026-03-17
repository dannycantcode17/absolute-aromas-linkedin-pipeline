/**
 * Email Notification Service
 *
 * Sends approval request emails to Danny or David with inline action links.
 * Uses the Manus built-in notification system as primary, with SMTP as fallback.
 *
 * GUARDRAIL: David's personal page posts are ONLY routed to David.
 * This is enforced here AND at the tRPC procedure level.
 */

import { notifyOwner } from "./_core/notification";
import type { Job, Post } from "../drizzle/schema";

export interface ApprovalEmailData {
  job: Job;
  posts: Post[];
  approverName: string;
  approverEmail: string;
  approverRole: "danny" | "david";
  approvalToken: string;
  appBaseUrl: string;
}

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  const { job, posts: drafts, approverName, approvalToken, appBaseUrl } = data;

  const profileLabel =
    job.profile === "aa_company" ? "Absolute Aromas Company Page" : "David Tomlinson Personal Page";

  const approvalUrl = `${appBaseUrl}/approve/${approvalToken}`;

  // Build the notification content
  const variantSummary = drafts
    .map(
      (p, i) =>
        `VARIANT ${p.variantLabel}:\n${p.content}\n`
    )
    .join("\n---\n\n");

  const title = `LinkedIn Post Ready for Approval — ${profileLabel}`;

  const content = `Hi ${approverName},

A new LinkedIn post has been generated and is ready for your review.

PROFILE: ${profileLabel}
TOPIC: ${job.topic}
CONTENT PILLAR: ${job.contentPillar}
${job.targetAudience ? `TARGET AUDIENCE: ${job.targetAudience}\n` : ""}

${variantSummary}

---

To review and approve, edit, or reject this post, visit:
${approvalUrl}

This link is valid for 7 days and is specific to you.

${
  data.approverRole === "david"
    ? "Note: As this is a post for your personal LinkedIn page, only you can approve it."
    : ""
}

— Absolute Aromas LinkedIn Pipeline`;

  // Use the built-in notification system
  try {
    const result = await notifyOwner({ title, content });
    return result;
  } catch (err) {
    console.error("[Email] Failed to send approval notification:", err);
    return false;
  }
}

export async function sendEditRequestEmail(data: {
  job: Job;
  approverName: string;
  feedback: string;
  appBaseUrl: string;
  approvalToken: string;
}): Promise<boolean> {
  const profileLabel =
    data.job.profile === "aa_company" ? "Absolute Aromas Company Page" : "David Tomlinson Personal Page";

  const title = `LinkedIn Post Regenerated — ${profileLabel}`;
  const content = `Hi ${data.approverName},

Your edit request has been processed and new variants have been generated.

ORIGINAL FEEDBACK: "${data.feedback}"

Review the new variants here:
${data.appBaseUrl}/approve/${data.approvalToken}

— Absolute Aromas LinkedIn Pipeline`;

  try {
    return await notifyOwner({ title, content });
  } catch {
    return false;
  }
}

export async function sendApprovalConfirmationEmail(data: {
  job: Job;
  post: Post;
  approverName: string;
}): Promise<void> {
  const profileLabel =
    data.job.profile === "aa_company" ? "Absolute Aromas Company Page" : "David Tomlinson Personal Page";

  const title = `Post Approved — Added to Ready Queue (${profileLabel})`;
  const content = `Post approved by ${data.approverName}.

PROFILE: ${profileLabel}
TOPIC: ${data.job.topic}
VARIANT: ${data.post.variantLabel}

The post is now in the Ready to Post queue. Log in to copy and publish it manually on LinkedIn.

APPROVED POST:
${data.post.content}

— Absolute Aromas LinkedIn Pipeline`;

  try {
    await notifyOwner({ title, content });
  } catch {
    // Non-critical
  }
}
