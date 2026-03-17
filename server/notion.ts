/**
 * Notion Style Guide Fetcher
 *
 * Fetches the live Absolute Aromas LinkedIn Writing Style Guide from Notion.
 * NEVER caches — always fetches fresh so edits take effect immediately.
 * If Notion is unreachable, throws a NotionUnavailableError so the caller
 * can queue the job for retry.
 */

const STYLE_GUIDE_PAGE_ID = "326362aad87381b89061e17c31c38873";

export class NotionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotionUnavailableError";
  }
}

export async function fetchStyleGuide(notionApiKey: string): Promise<string> {
  if (!notionApiKey) {
    throw new NotionUnavailableError("NOTION_API_KEY is not configured");
  }

  // Fetch the page blocks from Notion API
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${STYLE_GUIDE_PAGE_ID}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new NotionUnavailableError(`Notion API authentication failed: ${response.status}`);
    }
    if (response.status >= 500) {
      throw new NotionUnavailableError(`Notion API server error: ${response.status}`);
    }
    throw new NotionUnavailableError(`Notion API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as NotionBlocksResponse;
  return extractTextFromBlocks(data.results);
}

// ─── Notion API types (minimal) ───────────────────────────────────────────────

interface NotionBlocksResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function extractTextFromBlocks(blocks: NotionBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = extractBlockText(block);
    if (text) lines.push(text);
  }

  return lines.join("\n\n");
}

function extractRichText(richTextArray: unknown[]): string {
  if (!Array.isArray(richTextArray)) return "";
  return richTextArray
    .map((rt: unknown) => {
      const item = rt as { plain_text?: string };
      return item?.plain_text ?? "";
    })
    .join("");
}

function extractBlockText(block: NotionBlock): string {
  const type = block.type;
  const content = block[type] as Record<string, unknown> | undefined;
  if (!content) return "";

  const richText = content.rich_text as unknown[] | undefined;

  switch (type) {
    case "heading_1":
      return `# ${extractRichText(richText ?? [])}`;
    case "heading_2":
      return `## ${extractRichText(richText ?? [])}`;
    case "heading_3":
      return `### ${extractRichText(richText ?? [])}`;
    case "paragraph":
      return extractRichText(richText ?? []);
    case "bulleted_list_item":
      return `• ${extractRichText(richText ?? [])}`;
    case "numbered_list_item":
      return `- ${extractRichText(richText ?? [])}`;
    case "quote":
      return `> ${extractRichText(richText ?? [])}`;
    case "callout":
      return `[NOTE] ${extractRichText(richText ?? [])}`;
    case "divider":
      return "---";
    case "table": {
      // Tables are handled by their row children — skip the parent
      return "";
    }
    case "table_row": {
      const cells = content.cells as unknown[][] | undefined;
      if (!cells) return "";
      return "| " + cells.map((cell) => extractRichText(cell)).join(" | ") + " |";
    }
    default:
      // Try to extract any rich_text we can find
      if (richText) return extractRichText(richText);
      return "";
  }
}

// ─── Guardrail keyword lists ──────────────────────────────────────────────────

export const MEDICAL_CLAIM_PATTERNS = [
  /\b(treat|cure|heal|remedy|therapeutic|medicinal|diagnose|prevent disease|anti-inflammatory|analgesic|antibacterial|antifungal|antiviral)\b/gi,
  /\b(relieves? (pain|stress|anxiety|depression|insomnia))\b/gi,
  /\b(clinical(ly)? (proven|tested|effective))\b/gi,
  /\b(FDA|MHRA|approved for)\b/gi,
];

export const COMPETITOR_NAME_PATTERNS = [
  // Common essential oil brands — extend as needed
  /\b(doterra|doTERRA|Young Living|Tisserand|Neal's Yard|Aromatics International|Plant Therapy|Rocky Mountain Oils|Eden Botanicals|Florihana)\b/gi,
];

export const REVENUE_FIGURE_PATTERNS = [
  /\b(£|€|\$|USD|GBP|EUR)\s*\d[\d,.]*(k|m|bn|million|billion)?\b/gi,
  /\b\d[\d,.]*\s*(million|billion|thousand)\s*(pounds|dollars|euros|revenue|turnover)\b/gi,
  /\b(revenue|turnover|profit|margin)\s*(of|is|was|will be|projected)\s*(£|€|\$)?\s*\d/gi,
  // Catch "2.4 million in revenue" style
  /\d+\.?\d*\s*(million|billion|thousand|k)\s*(in\s+)?(revenue|turnover|profit|sales)/gi,
];

export const FINANCIAL_PROJECTION_PATTERNS = [
  /\b(projected|forecast|expected|anticipated)\s+(revenue|growth|profit|turnover|sales)\b/gi,
  /\b(will (grow|reach|hit|achieve|generate))\s+(£|€|\$)?\s*\d/gi,
];

export const POLITICAL_CONTENT_PATTERNS = [
  /\b(Brexit|Tory|Labour|Conservative|Liberal Democrat|SNP|UKIP|vote|election|parliament|MP|minister|government policy)\b/gi,
];

export const AUTO_PUBLISH_PATTERNS = [
  /\b(post (this|it) (now|immediately|automatically|directly to LinkedIn))\b/gi,
  /\b(auto.?publish|auto.?post|schedule (to|for) LinkedIn)\b/gi,
  // Catch "will be automatically published", "published to LinkedIn at"
  /\b(will be|automatically)\s+(published|posted|shared)\b/gi,
  /\b(published|posted|shared)\s+(to|on)\s+LinkedIn\b/gi,
];

export const SUPERLATIVE_CLAIM_PATTERNS = [
  /\b(world'?s? best|industry leader|number one|#1|leading provider|best in class|unrivalled|unmatched|unparalleled)\b/gi,
  /\b(the only|no one else|unlike anyone|unlike any other)\b/gi,
];
