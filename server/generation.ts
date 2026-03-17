/**
 * LinkedIn Post Generation Service
 *
 * Generates 3–5 post variants using the Claude LLM with:
 * - Profile-specific system prompts (AA Company vs David Personal)
 * - Live Notion style guide injected as context
 * - Structured JSON output for reliable parsing
 */

import { invokeLLM } from "./_core/llm";

export interface GeneratedVariant {
  label: string; // "A", "B", "C", "D", "E"
  content: string;
}

export interface GenerationInput {
  profile: "aa_company" | "david_personal";
  topic: string;
  contentPillar: string;
  targetAudience?: string;
  toneHint?: string;
  referenceUrl?: string;
  namedClientFlag: boolean;
  styleGuideText: string;
  editFeedback?: string; // Set on regeneration
  variantCount?: number; // Default 3
}

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

export async function generatePostVariants(input: GenerationInput): Promise<GeneratedVariant[]> {
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
