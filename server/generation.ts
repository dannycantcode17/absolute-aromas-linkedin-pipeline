/**
 * Content Generation Service
 *
 * Generates post/blog variants using the Claude LLM with:
 * - Profile-specific system prompts (AA Company / David Personal / Blog Post)
 * - In-app style guide injected as context (fetched from DB)
 * - Structured JSON output for reliable parsing
 *
 * LinkedIn profiles: 3–5 variants
 * Blog post profile: exactly 2 variants (Title + Meta + H2 body + tags)
 */

import { invokeLLM } from "./_core/llm";

export interface GeneratedVariant {
  label: string; // "A", "B", "C", "D", "E"
  content: string;
}

export interface GenerationInput {
  profile: "aa_company" | "david_personal" | "blog_post";
  topic: string;
  contentPillar: string;
  targetAudience?: string;
  toneHint?: string;
  referenceUrl?: string;
  namedClientFlag: boolean;
  styleGuideText: string;
  editFeedback?: string;
  variantCount?: number;
  // Blog-specific
  blogKeyword?: string;
  blogTone?: "educational" | "thought_leadership" | "story_driven";
  blogWordCount?: "short" | "standard" | "long";
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const AA_COMPANY_SYSTEM_PROMPT = `You are a professional LinkedIn content writer for Absolute Aromas, a UK-based premium essential oils manufacturer founded in 1994.

You write for the ABSOLUTE AROMAS COMPANY PAGE — the brand speaking, not an individual.

KEY FACTS ABOUT ABSOLUTE AROMAS:
- Founded 1994, Hampshire UK, ~30 staff
- In-house GC-MS lab — every batch chemically tested
- Soil Association organic certified
- 30-year direct producer supply network — no broker layer
- ISO and GMP certified manufacturing facility
- 60–80% gross margin on private label manufacturing
- Founder David Tomlinson sits on boards of IFEAT and ATC

VOICE: Authoritative, specific, credentialed, commercially focused. "We" not "I". Educational. Understated confidence. Clean and professional.

ABSOLUTE PROHIBITIONS — never include:
- Medical or therapeutic claims about products
- Competitor names
- Specific revenue figures or financial projections
- Named clients (unless explicitly instructed)
- Engagement bait ("Drop a comment below")
- Hollow announcements without substance
- Generic phrases: "passionate about", "journey", "excited to share", "amazing"
- More than 3 hashtags

FORMAT:
- Length: 150–300 words (educational posts can run longer)
- Opening line: scroll-stopper, standalone, no preamble
- Short paragraphs, 2–3 sentences each
- Closing: real question, quiet CTA ("DM if relevant"), or strong statement — never generic

The full style guide is provided below as your primary reference.`;

const DAVID_PERSONAL_SYSTEM_PROMPT = `You are writing in the voice of David Tomlinson — founder of Absolute Aromas, 30+ years in the essential oils industry, board member of IFEAT (International Federation of Essential Oils and Aroma Trades) and the ATC (Aromatherapy Trade Council).

You write for DAVID'S PERSONAL LINKEDIN PAGE — David speaking as an individual, not as a brand.

DAVID'S CHARACTER:
- Industry elder statesman — plain, unhurried, earned the right to take his time
- Insider perspective: things brands don't know, only obvious after decades in the trade
- Quietly authoritative — doesn't need to prove anything
- Warm — genuinely cares about the industry
- Occasionally personal: sourcing trip memories, IFEAT observations, things clients said

VOICE: First person ("I", "we've seen", "in my experience"). Never sounds like a brand post. No pitching Absolute Aromas directly — connection is implicit.

ABSOLUTE PROHIBITIONS — never include:
- Medical or therapeutic claims
- Competitor names
- Specific revenue figures or financial projections
- Named clients (unless explicitly instructed)
- Generic LinkedIn clichés: "Unpopular opinion:", "Hot take:", "This changed everything"
- More than 2 hashtags
- Anything a marketing team could have written

FORMAT:
- Length: 100–250 words. Shorter is often better. David doesn't pad.
- Opening: a plain observation, a question, or a single sentence from experience — not a headline
- More conversational than the company page. Paragraph breaks feel natural.
- Closing: often just ends. No forced CTA. Sometimes a genuine question he's curious about.
- First person throughout.

The full style guide is provided below as your primary reference.`;

const BLOG_POST_SYSTEM_PROMPT = `You are a professional content writer for Absolute Aromas, a UK-based premium essential oils manufacturer founded in 1994.

You write BLOG POSTS for the Absolute Aromas website — long-form, educational, SEO-aware content.

KEY FACTS ABOUT ABSOLUTE AROMAS:
- Founded 1994, Hampshire UK, ~30 staff
- In-house GC-MS lab — every batch chemically tested
- Soil Association organic certified
- 30-year direct producer supply network — no broker layer
- ISO and GMP certified manufacturing facility
- Founder David Tomlinson sits on boards of IFEAT and ATC

VOICE: Authoritative, specific, educational. The tone of an expert practitioner writing for a knowledgeable audience. Not a sales pitch — genuine value first.

ABSOLUTE PROHIBITIONS — never include:
- Medical or therapeutic claims (do not say products treat, cure, or heal conditions)
- Competitor names
- Specific revenue figures or financial projections
- Named clients (unless explicitly instructed)
- Keyword stuffing or unnatural SEO phrasing
- Hollow filler content

OUTPUT FORMAT — you must return a structured blog post with these exact sections:
1. TITLE: Compelling, SEO-aware headline (60–70 characters ideal)
2. META_DESCRIPTION: 140–155 character summary for search engines
3. BODY: Full article with H2 subheadings using markdown (## Heading). Each H2 section should be 2–4 paragraphs.
4. SUGGESTED_INTERNAL_LINKS: 2–3 suggested internal link anchor texts and topics (e.g., "our GC-MS testing process", "organic certification standards")
5. SUGGESTED_TAGS: 4–6 relevant tags (comma-separated)

The full style guide is provided below as your primary reference.`;

// ─── Word count targets ───────────────────────────────────────────────────────

const BLOG_WORD_COUNT_TARGETS: Record<string, string> = {
  short: "approximately 700–900 words",
  standard: "approximately 1400–1600 words",
  long: "approximately 2400–2600 words",
};

// ─── Main generation function ─────────────────────────────────────────────────

export async function generatePostVariants(input: GenerationInput): Promise<GeneratedVariant[]> {
  if (input.profile === "blog_post") {
    return generateBlogVariants(input);
  }
  return generateLinkedInVariants(input);
}

// ─── LinkedIn generation ──────────────────────────────────────────────────────

async function generateLinkedInVariants(input: GenerationInput): Promise<GeneratedVariant[]> {
  const variantCount = input.variantCount ?? 3;
  const variantLabels = ["A", "B", "C", "D", "E"].slice(0, variantCount);

  const systemPrompt =
    input.profile === "aa_company" ? AA_COMPANY_SYSTEM_PROMPT : DAVID_PERSONAL_SYSTEM_PROMPT;

  const namedClientInstruction = input.namedClientFlag
    ? "The submitter has confirmed this post may reference a named client. You may include client references if relevant."
    : "Do NOT include any named clients, company names, or identifiable client details.";

  const editContext = input.editFeedback
    ? `\n\nREGENERATION FEEDBACK FROM APPROVER:\n"${input.editFeedback}"\nPlease incorporate this feedback into the new variants.`
    : "";

  const userPrompt = `STYLE GUIDE (read this carefully before writing):
---
${input.styleGuideText}
---

CONTENT REQUEST:
- Topic / Idea: ${input.topic}
- Content Pillar: ${input.contentPillar}
${input.targetAudience ? `- Target Audience: ${input.targetAudience}` : ""}
${input.toneHint ? `- Tone Hint: ${input.toneHint}` : ""}
${input.referenceUrl ? `- Reference URL: ${input.referenceUrl}` : ""}
- Named Client Instruction: ${namedClientInstruction}
${editContext}

Generate exactly ${variantCount} distinct LinkedIn post variants (labelled ${variantLabels.join(", ")}).
Each variant should take a different angle, structure, or emphasis on the same topic.
Make each variant genuinely different — not just minor rewording.

Respond with a JSON object in this exact format:
{
  "variants": [
    { "label": "A", "content": "Full post text here..." },
    { "label": "B", "content": "Full post text here..." }
  ]
}

Return ONLY the JSON object. No preamble, no explanation.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "linkedin_variants",
        strict: true,
        schema: {
          type: "object",
          properties: {
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  content: { type: "string" },
                },
                required: ["label", "content"],
                additionalProperties: false,
              },
            },
          },
          required: ["variants"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response?.choices?.[0]?.message?.content;
  const raw = typeof rawContent === "string" ? rawContent : null;
  if (!raw) throw new Error("LLM returned empty response");

  const parsed = JSON.parse(raw) as { variants: GeneratedVariant[] };
  if (!parsed.variants?.length) throw new Error("LLM returned no variants");

  return parsed.variants;
}

// ─── Blog post generation ─────────────────────────────────────────────────────

async function generateBlogVariants(input: GenerationInput): Promise<GeneratedVariant[]> {
  const wordCountTarget = BLOG_WORD_COUNT_TARGETS[input.blogWordCount ?? "standard"];
  const toneLabel = input.blogTone
    ? { educational: "Educational", thought_leadership: "Thought Leadership", story_driven: "Story-driven" }[input.blogTone]
    : "Educational";

  const namedClientInstruction = input.namedClientFlag
    ? "The submitter has confirmed this post may reference a named client. You may include client references if relevant."
    : "Do NOT include any named clients, company names, or identifiable client details.";

  const editContext = input.editFeedback
    ? `\n\nREGENERATION FEEDBACK FROM APPROVER:\n"${input.editFeedback}"\nPlease incorporate this feedback into the new variants.`
    : "";

  const userPrompt = `STYLE GUIDE (read this carefully before writing):
---
${input.styleGuideText}
---

BLOG POST REQUEST:
- Topic: ${input.topic}
- Content Pillar: ${input.contentPillar}
- Tone: ${toneLabel}
- Target Word Count: ${wordCountTarget}
${input.blogKeyword ? `- Target Keyword / SEO Topic: ${input.blogKeyword}` : ""}
${input.referenceUrl ? `- Reference URL: ${input.referenceUrl}` : ""}
- Named Client Instruction: ${namedClientInstruction}
${editContext}

Generate exactly 2 distinct blog post variants (labelled A and B).
Each variant should take a meaningfully different angle or structure on the same topic.

For EACH variant, return a structured blog post with these exact fields:
- title: Compelling, SEO-aware headline (60–70 characters ideal)
- meta_description: 140–155 character summary for search engines
- body: Full article body in markdown with ## H2 subheadings. Target ${wordCountTarget}.
- suggested_internal_links: Array of 2–3 suggested internal link anchor text strings
- suggested_tags: Array of 4–6 relevant tag strings

Respond with a JSON object in this exact format:
{
  "variants": [
    {
      "label": "A",
      "title": "...",
      "meta_description": "...",
      "body": "## Introduction\\n\\n...",
      "suggested_internal_links": ["anchor text 1", "anchor text 2"],
      "suggested_tags": ["tag1", "tag2", "tag3"]
    },
    {
      "label": "B",
      "title": "...",
      "meta_description": "...",
      "body": "## Introduction\\n\\n...",
      "suggested_internal_links": ["anchor text 1", "anchor text 2"],
      "suggested_tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Return ONLY the JSON object. No preamble, no explanation.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: BLOG_POST_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "blog_variants",
        strict: true,
        schema: {
          type: "object",
          properties: {
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  title: { type: "string" },
                  meta_description: { type: "string" },
                  body: { type: "string" },
                  suggested_internal_links: { type: "array", items: { type: "string" } },
                  suggested_tags: { type: "array", items: { type: "string" } },
                },
                required: ["label", "title", "meta_description", "body", "suggested_internal_links", "suggested_tags"],
                additionalProperties: false,
              },
            },
          },
          required: ["variants"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response?.choices?.[0]?.message?.content;
  const raw = typeof rawContent === "string" ? rawContent : null;
  if (!raw) throw new Error("LLM returned empty response for blog generation");

  interface BlogVariantRaw {
    label: string;
    title: string;
    meta_description: string;
    body: string;
    suggested_internal_links: string[];
    suggested_tags: string[];
  }

  const parsed = JSON.parse(raw) as { variants: BlogVariantRaw[] };
  if (!parsed.variants?.length) throw new Error("LLM returned no blog variants");

  // Serialise the structured blog output into a single content string
  // so it fits the existing posts.content column and copy-to-clipboard flow.
  return parsed.variants.map((v) => ({
    label: v.label,
    content: [
      `# ${v.title}`,
      ``,
      `**Meta Description:** ${v.meta_description}`,
      ``,
      v.body,
      ``,
      `---`,
      `**Suggested Internal Links:** ${v.suggested_internal_links.join(" · ")}`,
      `**Suggested Tags:** ${v.suggested_tags.join(", ")}`,
    ].join("\n"),
  }));
}
