/**
 * Guardrail Regex Patterns
 *
 * These patterns are used by the guardrail validation service to detect
 * content that should be flagged or blocked before routing to approvers.
 *
 * Previously these lived in notion.ts — moved here so notion.ts is
 * exclusively responsible for audit log sync, with no other dependencies.
 */

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
