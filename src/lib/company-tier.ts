// Values above 4 represent companies below the Tier 4 threshold. The UI
// intentionally groups those together as "Tier 4 ↓".
export type CompanyTier = 1 | 2 | 3 | 4 | 5;

export interface CompanyTierInfo {
  tier: CompanyTier;
  rating: number;
}

const TIER_1 = [
  "google", "alphabet", "apple", "microsoft", "meta", "facebook", "amazon", "netflix",
  "nvidia", "openai", "anthropic", "tesla", "adobe", "salesforce", "broadcom", "tiktok", "bytedance",
];
const TIER_2 = ["uber", "airbnb", "ibm", "oracle", "intel", "qualcomm", "spotify", "shopify", "stripe", "twilio"];

function normalizedCompanyName(companyName: string) {
  return companyName.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

/**
 * A small, transparent company-tier baseline. Tier 1 is intentionally reserved
 * for the named Big Tech / FAANG companies and receives the user-defined 10/10
 * company benchmark. Companies without a curated entry use Tier 3 until a
 * company profile adds a more specific classification.
 */
export function getCompanyTier(companyName: string): CompanyTierInfo {
  const name = normalizedCompanyName(companyName);
  if (TIER_1.some((company) => name.includes(normalizedCompanyName(company)))) return { tier: 1, rating: 10 };
  if (TIER_2.some((company) => name.includes(normalizedCompanyName(company)))) return { tier: 2, rating: 8 };
  return { tier: 3, rating: 6 };
}

export function formatCompanyTier(tier: CompanyTier) {
  return tier > 4 ? "Tier 4 ↓" : `Tier ${tier}`;
}
