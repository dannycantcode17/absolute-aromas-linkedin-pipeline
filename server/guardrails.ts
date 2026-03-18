/**
 * Guardrail Validation Service
 *
 * Every generated post draft is run through these checks before being
 * routed to an approver. Blocking flags prevent routing; warning flags
 * are surfaced to the approver but do not block.
 *
 * These checks are enforced at the server level — they cannot be bypassed
 * by any frontend action.
 */

import type { GuardrailFlag } from "../drizzle/schema";
import {
  AUTO_PUBLISH_PATTERNS,
  COMPETITOR_NAME_PATTERNS,
  FINANCIAL_PROJECTION_PATTERNS,
  MEDICAL_CLAIM_PATTERNS,
  POLITICAL_CONTENT_PATTERNS,
  REVENUE_FIGURE_PATTERNS,
  SUPERLATIVE_CLAIM_PATTERNS,
} from "./guardrailPatterns";

export interface GuardrailResult {
  passed: boolean; // true = no blocking flags
  flags: GuardrailFlag[];
}

export function runGuardrails(
  content: string,
  options: { namedClientFlag: boolean }
): GuardrailResult {
  const flags: GuardrailFlag[] = [];

  // 1. Medical / therapeutic claims — BLOCK
  for (const pattern of MEDICAL_CLAIM_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "medical_claim",
        severity: "block",
        excerpt: match[0],
        description: `Post contains a potential medical or therapeutic claim: "${match[0]}". This violates brand guardrails and UK/EU advertising regulations.`,
      });
      break; // one flag per category is enough
    }
  }

  // 2. Competitor names — BLOCK
  for (const pattern of COMPETITOR_NAME_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "competitor_mention",
        severity: "block",
        excerpt: match[0],
        description: `Post names a competitor: "${match[0]}". Competitor names must not appear in published posts.`,
      });
      break;
    }
  }

  // 3. Revenue figures — BLOCK
  for (const pattern of REVENUE_FIGURE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "revenue_figure",
        severity: "block",
        excerpt: match[0],
        description: `Post contains a specific revenue or financial figure: "${match[0]}". Financial figures are not permitted in public posts.`,
      });
      break;
    }
  }

  // 4. Financial projections — BLOCK
  for (const pattern of FINANCIAL_PROJECTION_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "financial_projection",
        severity: "block",
        excerpt: match[0],
        description: `Post contains a financial projection: "${match[0]}". Forward-looking financial statements are not permitted.`,
      });
      break;
    }
  }

  // 5. Auto-publish language — BLOCK (defence-in-depth)
  for (const pattern of AUTO_PUBLISH_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "auto_publish_trigger",
        severity: "block",
        excerpt: match[0],
        description: `Post contains language that could trigger automated publishing: "${match[0]}". This system never auto-publishes.`,
      });
      break;
    }
  }

  // 6. Named client without flag — BLOCK
  if (!options.namedClientFlag) {
    const clientPatterns = [
      /\b(our client|a client of ours|working with [A-Z][a-z]+ [A-Z][a-z]+)\b/gi,
      /\b([A-Z][a-z]+ (Ltd|Limited|PLC|Inc|LLC|GmbH|SAS|BV))\b/g,
      // Catch "our client Boots UK" or "client Boots"
      /\bclient\s+[A-Z][A-Za-z]+\b/g,
    ];
    for (const pattern of clientPatterns) {
      const match = content.match(pattern);
      if (match) {
        flags.push({
          type: "named_client",
          severity: "block",
          excerpt: match[0],
          description: `Post may reference a named client ("${match[0]}") but the Named Client flag was not set. Please set the flag and confirm client permission before generating.`,
        });
        break;
      }
    }
  }

  // 7. Superlative / unsubstantiated claims — WARN
  for (const pattern of SUPERLATIVE_CLAIM_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "superlative_claim",
        severity: "warn",
        excerpt: match[0],
        description: `Post contains an unsubstantiated superlative claim: "${match[0]}". Ensure this can be evidenced or soften the language.`,
      });
      break;
    }
  }

  // 8. Political content — WARN
  for (const pattern of POLITICAL_CONTENT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      flags.push({
        type: "political_content",
        severity: "warn",
        excerpt: match[0],
        description: `Post may contain politically contentious content: "${match[0]}". Review carefully before approving.`,
      });
      break;
    }
  }

  const hasBlockingFlag = flags.some((f) => f.severity === "block");

  return {
    passed: !hasBlockingFlag,
    flags,
  };
}
