/**
 * Content pillars sourced from the Absolute Aromas style guide.
 * Keep in sync with server/routers.ts AA_COMPANY_PILLARS / DAVID_PERSONAL_PILLARS.
 */

export const AA_COMPANY_PILLARS: string[] = [
  "Manufacturer Authority",
  "Private Label Education",
  "Made by Makers",
  "ICP Pain Points",
  "Social Proof & Case Studies",
  "Industry News & Commentary",
];

export const DAVID_PERSONAL_PILLARS: string[] = [
  "Industry Insider",
  "Sourcing & Origin",
  "Quality & Adulteration",
  "Founder Perspective",
  "Brand Advice",
  "Industry History & Evolution",
];

export const ALL_PILLARS: string[] = [...AA_COMPANY_PILLARS, ...DAVID_PERSONAL_PILLARS];
