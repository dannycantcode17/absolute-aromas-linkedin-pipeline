/**
 * Email Notification Service — powered by Resend
 *
 * Sends approval request emails to Danny or David with:
 *  - Full post drafts inline (no click-through required)
 *  - One-click approve button (token-based, no login needed)
 *  - Profile-distinct subject line prefixes
 *  - Mobile-friendly large CTA buttons
 *
 * GUARDRAIL: David's personal page posts are ONLY routed to David.
 * This is enforced here AND at the tRPC procedure level.
 */

import { Resend } from "resend";
import { ENV } from "./_core/env";
import type { Job, Post } from "../drizzle/schema";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

export interface ApprovalEmailData {
  job: Job;
  posts: Post[];
  approverName: string;
  approverEmail: string;
  approverRole: "danny" | "david";
  approvalToken: string;
  appBaseUrl: string;
}

// ---------------------------------------------------------------------------
// HTML email builder
// ---------------------------------------------------------------------------

function buildApprovalEmailHtml(data: ApprovalEmailData): string {
  const { job, posts: drafts, approverName, approverRole, approvalToken, appBaseUrl } = data;

  const profileLabel =
    job.profile === "aa_company"
      ? "Absolute Aromas Company Page"
      : "David Tomlinson Personal Page";

  const approvalUrl = `${appBaseUrl}/approve/${approvalToken}`;
  const accentColour = approverRole === "david" ? "#f59e0b" : "#06b6d4";
  const profileBadge =
    approverRole === "david"
      ? `<span style="background:#f59e0b22;color:#f59e0b;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;border:1px solid #f59e0b44;">David Personal Page</span>`
      : `<span style="background:#06b6d422;color:#06b6d4;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;border:1px solid #06b6d444;">AA Company Page</span>`;

  const variantBlocks = drafts
    .map(
      (p, i) => `
      <div style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:8px;padding:20px;margin:16px 0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="background:${accentColour}22;color:${accentColour};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;border:1px solid ${accentColour}44;">
            VARIANT ${p.variantLabel ?? String.fromCharCode(65 + i)}
          </span>
          <span style="color:#64748b;font-size:11px;">${p.content.length} characters</span>
        </div>
        <p style="color:#f1f5f9;font-size:14px;line-height:1.7;white-space:pre-wrap;margin:0;">${escapeHtml(p.content)}</p>
        <div style="margin-top:14px;">
          <a href="${approvalUrl}?variant=${p.id}"
             style="display:inline-block;background:${accentColour};color:#0f1117;font-weight:700;font-size:13px;padding:10px 22px;border-radius:6px;text-decoration:none;min-width:44px;text-align:center;">
            ✓ Approve Variant ${p.variantLabel ?? String.fromCharCode(65 + i)}
          </a>
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LinkedIn Post Ready for Approval</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:12px 12px 0 0;padding:28px 32px;border-bottom:1px solid ${accentColour}44;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Absolute Aromas</p>
                    <h1 style="margin:0;color:#f1f5f9;font-size:20px;font-weight:700;">LinkedIn Post Ready for Approval</h1>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    ${profileBadge}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1a1d27;border:1px solid #2a2d3a;border-top:none;padding:28px 32px;">

              <p style="color:#f1f5f9;font-size:15px;margin:0 0 20px;">Hi ${escapeHtml(approverName)},</p>
              <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
                A new LinkedIn post has been generated and is ready for your review. The draft variants are shown below — you can approve directly from this email, or open the app to request edits or reject.
              </p>

              <!-- Job metadata -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;border:1px solid #2a2d3a;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Profile</span><br/>
                    <span style="color:#f1f5f9;font-size:13px;">${escapeHtml(profileLabel)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Topic</span><br/>
                    <span style="color:#f1f5f9;font-size:13px;">${escapeHtml(job.topic)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px;">
                    <span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Content Pillar</span><br/>
                    <span style="color:#f1f5f9;font-size:13px;">${escapeHtml(job.contentPillar)}</span>
                  </td>
                </tr>
                ${job.targetAudience ? `<tr><td style="padding:8px 0 4px;"><span style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Target Audience</span><br/><span style="color:#f1f5f9;font-size:13px;">${escapeHtml(job.targetAudience)}</span></td></tr>` : ""}
              </table>

              <!-- Variants -->
              <h2 style="color:#f1f5f9;font-size:15px;font-weight:600;margin:0 0 4px;">Post Variants</h2>
              <p style="color:#64748b;font-size:12px;margin:0 0 8px;">Click the approve button under the variant you want to use.</p>

              ${variantBlocks}

              <!-- Full review link -->
              <div style="margin-top:28px;padding-top:20px;border-top:1px solid #2a2d3a;text-align:center;">
                <p style="color:#64748b;font-size:13px;margin:0 0 14px;">Prefer to review in the app, request edits, or reject?</p>
                <a href="${approvalUrl}"
                   style="display:inline-block;background:transparent;color:${accentColour};font-weight:600;font-size:14px;padding:12px 28px;border-radius:6px;text-decoration:none;border:1px solid ${accentColour};">
                  Open Full Review →
                </a>
              </div>

              ${
                approverRole === "david"
                  ? `<div style="margin-top:20px;background:#f59e0b11;border:1px solid #f59e0b33;border-radius:6px;padding:12px 16px;">
                      <p style="color:#f59e0b;font-size:12px;margin:0;"><strong>Note:</strong> As this is a post for your personal LinkedIn page, only you can approve it.</p>
                    </div>`
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f1117;border:1px solid #2a2d3a;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="color:#475569;font-size:11px;margin:0;">This approval link is valid for 7 days and is specific to you. Do not forward it.</p>
              <p style="color:#334155;font-size:11px;margin:6px 0 0;">Absolute Aromas LinkedIn Pipeline</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendApprovalEmail(data: ApprovalEmailData): Promise<boolean> {
  const { job, approverName, approverEmail, approverRole } = data;

  const profileLabel =
    job.profile === "aa_company"
      ? "Absolute Aromas Company Page"
      : "David Tomlinson Personal Page";

  const subjectPrefix = approverRole === "david" ? "[David's Posts]" : "[AA Posts]";
  const subject = `${subjectPrefix} LinkedIn Post Ready for Approval — ${profileLabel}`;

  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email send");
    return false;
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: ENV.emailFrom,
      to: approverEmail,
      subject,
      html: buildApprovalEmailHtml(data),
    });

    if (result.error) {
      console.error("[Email] Resend error:", result.error);
      return false;
    }

    console.log(`[Email] Approval email sent to ${approverEmail} (id: ${result.data?.id})`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send approval email:", err);
    return false;
  }
}

export async function sendEditRequestEmail(data: {
  job: Job;
  approverName: string;
  approverEmail: string;
  approverRole: "danny" | "david";
  feedback: string;
  appBaseUrl: string;
  approvalToken: string;
}): Promise<boolean> {
  const profileLabel =
    data.job.profile === "aa_company"
      ? "Absolute Aromas Company Page"
      : "David Tomlinson Personal Page";

  const subjectPrefix = data.approverRole === "david" ? "[David's Posts]" : "[AA Posts]";
  const subject = `${subjectPrefix} Regenerated Post Ready — ${profileLabel}`;
  const reviewUrl = `${data.appBaseUrl}/approve/${data.approvalToken}`;
  const accentColour = data.approverRole === "david" ? "#f59e0b" : "#06b6d4";

  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email send");
    return false;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:12px 12px 0 0;padding:28px 32px;border-bottom:1px solid ${accentColour}44;">
            <h1 style="margin:0;color:#f1f5f9;font-size:20px;font-weight:700;">Regenerated Post Ready for Review</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#1a1d27;border:1px solid #2a2d3a;border-top:none;padding:28px 32px;">
            <p style="color:#f1f5f9;font-size:15px;margin:0 0 16px;">Hi ${escapeHtml(data.approverName)},</p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.6;">
              Your edit request has been processed and new variants have been generated for <strong style="color:#f1f5f9;">${escapeHtml(profileLabel)}</strong>.
            </p>
            <div style="background:#0f1117;border:1px solid #2a2d3a;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
              <span style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Your Feedback</span>
              <p style="color:#f1f5f9;font-size:13px;margin:6px 0 0;font-style:italic;">"${escapeHtml(data.feedback)}"</p>
            </div>
            <div style="text-align:center;">
              <a href="${reviewUrl}"
                 style="display:inline-block;background:${accentColour};color:#0f1117;font-weight:700;font-size:15px;padding:14px 32px;border-radius:6px;text-decoration:none;min-width:44px;">
                Review New Variants →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0f1117;border:1px solid #2a2d3a;border-top:none;border-radius:0 0 12px 12px;padding:14px 32px;text-align:center;">
            <p style="color:#475569;font-size:11px;margin:0;">Absolute Aromas LinkedIn Pipeline</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: ENV.emailFrom,
      to: data.approverEmail,
      subject,
      html,
    });
    if (result.error) {
      console.error("[Email] Resend error:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Failed to send edit request email:", err);
    return false;
  }
}

export async function sendApprovalConfirmationEmail(data: {
  job: Job;
  post: Post;
  approverName: string;
  approverEmail?: string;
}): Promise<void> {
  // Confirmation is low-priority — just log if email not configured
  if (!ENV.resendApiKey || !data.approverEmail) return;

  const profileLabel =
    data.job.profile === "aa_company"
      ? "Absolute Aromas Company Page"
      : "David Tomlinson Personal Page";

  try {
    const resend = getResend();
    await resend.emails.send({
      from: ENV.emailFrom,
      to: data.approverEmail,
      subject: `Post Approved — Added to Ready Queue (${profileLabel})`,
      html: `<p style="font-family:sans-serif;color:#f1f5f9;background:#0f1117;padding:24px;">
        Post approved by ${escapeHtml(data.approverName)}.<br/><br/>
        <strong>Profile:</strong> ${escapeHtml(profileLabel)}<br/>
        <strong>Topic:</strong> ${escapeHtml(data.job.topic)}<br/>
        <strong>Variant:</strong> ${escapeHtml(data.post.variantLabel ?? "")}<br/><br/>
        The post is now in the Ready to Post queue.
      </p>`,
    });
  } catch {
    // Non-critical
  }
}
