/**
 * Notion Audit Log Sync
 *
 * Writes post lifecycle events to a Notion database for permanent audit trail.
 * This is a best-effort sync — failures are logged but do not block the main workflow.
 *
 * The Notion database should have these properties:
 *   - Job ID (number)
 *   - Post ID (number, optional)
 *   - Profile (select: AA Company | David Personal)
 *   - Topic (title/rich text)
 *   - Content Pillar (rich text)
 *   - Action (select)
 *   - Actor (rich text)
 *   - Details (rich text)
 *   - Timestamp (date)
 *   - Post Content (rich text, optional)
 *   - Approver (rich text, optional)
 */

interface NotionAuditEntry {
  jobId: number;
  postId?: number;
  profile: "aa_company" | "david_personal";
  topic: string;
  contentPillar: string;
  action: string;
  actor: string;
  details?: Record<string, unknown>;
  postContent?: string;
  approver?: string;
}

async function callNotionApi(
  endpoint: string,
  method: string,
  body: unknown,
  apiKey: string
): Promise<unknown> {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function syncAuditEntryToNotion(
  entry: NotionAuditEntry,
  notionApiKey: string,
  auditDatabaseId: string
): Promise<void> {
  if (!notionApiKey || !auditDatabaseId) {
    console.warn("[NotionAudit] Skipping sync — NOTION_API_KEY or NOTION_AUDIT_DB_ID not set");
    return;
  }

  const profileLabel = entry.profile === "aa_company" ? "AA Company Page" : "David Personal Page";
  const detailsText = entry.details ? JSON.stringify(entry.details, null, 2) : "";

  const pageProperties: Record<string, unknown> = {
    // Title property — use "Name" or "Topic" depending on your DB setup
    Topic: {
      title: [{ text: { content: entry.topic.slice(0, 2000) } }],
    },
    "Job ID": {
      number: entry.jobId,
    },
    Profile: {
      select: { name: profileLabel },
    },
    "Content Pillar": {
      rich_text: [{ text: { content: entry.contentPillar.slice(0, 2000) } }],
    },
    Action: {
      select: { name: entry.action.replace(/_/g, " ") },
    },
    Actor: {
      rich_text: [{ text: { content: entry.actor.slice(0, 2000) } }],
    },
    Timestamp: {
      date: { start: new Date().toISOString() },
    },
  };

  if (entry.postId) {
    pageProperties["Post ID"] = { number: entry.postId };
  }

  if (entry.approver) {
    pageProperties["Approver"] = {
      rich_text: [{ text: { content: entry.approver.slice(0, 2000) } }],
    };
  }

  // Build page content blocks
  const children: unknown[] = [];

  if (entry.postContent) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Post Content" } }] },
    });
    // Split into 2000-char chunks (Notion limit per text block)
    const chunks = entry.postContent.match(/[\s\S]{1,2000}/g) ?? [];
    for (const chunk of chunks) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ text: { content: chunk } }] },
      });
    }
  }

  if (detailsText) {
    children.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ text: { content: "Details" } }] },
    });
    const chunks = detailsText.match(/[\s\S]{1,2000}/g) ?? [];
    for (const chunk of chunks) {
      children.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [{ text: { content: chunk } }],
          language: "json",
        },
      });
    }
  }

  const payload: Record<string, unknown> = {
    parent: { database_id: auditDatabaseId },
    properties: pageProperties,
  };

  if (children.length > 0) {
    payload.children = children;
  }

  await callNotionApi("/pages", "POST", payload, notionApiKey);
}

/**
 * Best-effort wrapper — never throws, always logs errors.
 */
export async function syncAuditToNotionSafe(
  entry: NotionAuditEntry,
  notionApiKey: string,
  auditDatabaseId: string
): Promise<void> {
  try {
    await syncAuditEntryToNotion(entry, notionApiKey, auditDatabaseId);
  } catch (err) {
    console.error("[NotionAudit] Sync failed (non-blocking):", err);
  }
}
