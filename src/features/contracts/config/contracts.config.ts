/**
 * @module contracts.config
 * Feature-level configuration for the Contracts module.
 *
 * CONTRACT_CUTOFF_DATE — the date after which Basic plan users lose access.
 * Set this to (launch_date + 90 days) when the feature goes live in production.
 * Currently set to 90 days from the project reference date (2026-03-25).
 */

export const CONTRACT_CUTOFF_DATE = new Date("2026-06-23T00:00:00Z");

/**
 * Default clause keys that map to profile columns.
 * Order reflects the default rendering order in Step 2.
 */
export const DEFAULT_CLAUSE_KEYS = [
  "scope_of_work",
  "purpose_of_agreement",
  "price_and_payment",
  "cancellation_policy",
  "no_refund",
  "non_compete",
  "anti_harassment",
  "liability_insurance",
  "confidentiality",
] as const;

export type DefaultClauseKey = (typeof DEFAULT_CLAUSE_KEYS)[number];

/** Display titles for default clauses */
export const DEFAULT_CLAUSE_TITLES: Record<DefaultClauseKey, string> = {
  scope_of_work:        "Scope of Work",
  purpose_of_agreement: "Purpose of Agreement",
  price_and_payment:    "Price and Payment",
  cancellation_policy:  "Cancellation Policy",
  no_refund:            "No Refund Policy",
  non_compete:          "Non-Compete",
  anti_harassment:      "Anti-Harassment",
  liability_insurance:  "Liability & Insurance",
  confidentiality:      "Confidentiality",
};

// ─── Step 2 section definitions ───────────────────────────────────────────────

/** Full section metadata for Step 2 (order = default display order) */
export const DEFAULT_SECTIONS = [
  { key: "scope_of_work",        title: "Scope of Work",                      placeholder: "Describe the specific work, tasks, and deliverables covered under this contract." },
  { key: "purpose_of_agreement", title: "Purpose of the Agreement",           placeholder: "Explain the purpose and intent of this agreement between both parties." },
  { key: "price_and_payment",    title: "Price and Payment Terms",            placeholder: "Detail the pricing structure, payment schedule, accepted methods, and any late payment penalties." },
  { key: "cancellation_policy",  title: "Cancellation Policy",                placeholder: "Outline the terms and conditions for cancellation, including notice periods and any fees." },
  { key: "no_refund",            title: "No Refund Clause",                   placeholder: "State the no refund policy and any exceptions or conditions that may apply." },
  { key: "non_compete",          title: "Non-Compete Clause",                 placeholder: "Define non-compete restrictions, duration, and geographic limitations." },
  { key: "anti_harassment",      title: "Anti-Harassment and Respect Policy", placeholder: "Detail the expected standards of conduct and anti-harassment policies." },
  { key: "liability_insurance",  title: "Liability and Insurance",            placeholder: "Specify liability limits, insurance requirements, and indemnification terms." },
  { key: "confidentiality",      title: "Confidentiality",                    placeholder: "Outline the confidentiality obligations, scope of protected information, and duration." },
] as const;

/** Maps clause key → profile column name for saving defaults */
export const CLAUSE_PROFILE_MAP: Record<string, string> = {
  scope_of_work:        "clause_scope_of_work",
  purpose_of_agreement: "clause_purpose_of_agreement",
  price_and_payment:    "clause_price_and_payment",
  cancellation_policy:  "clause_cancellation_policy",
  no_refund:            "clause_no_refund",
  non_compete:          "clause_non_compete",
  anti_harassment:      "clause_anti_harassment",
  liability_insurance:  "clause_liability_insurance",
  confidentiality:      "clause_confidentiality",
};

/** Keys that cannot be auto-generated — user must write manually */
export const MANUAL_ONLY_KEYS = new Set([
  "scope_of_work",
  "purpose_of_agreement",
  "price_and_payment",
]);

/**
 * Maps frontend clause key (snake_case) → backend clauseType (camelCase).
 * The edge function `generate-company-description` uses camelCase keys.
 */
export const CLAUSE_KEY_TO_BACKEND: Record<string, string> = {
  cancellation_policy: "cancellationPolicy",
  no_refund:           "noRefundClause",
  non_compete:         "nonCompeteClause",
  anti_harassment:     "antiHarassment",
  liability_insurance: "liabilityInsurance",
  confidentiality:     "confidentiality",
};

/** Maps Step 1 field name → profile column for saving defaults */
export const DESCRIPTION_PROFILE_MAP: Record<string, string> = {
  who_we_are:       "who_we_are_default",
  why_choose_us:    "why_choose_us_default",
  our_services:     "our_services_default",
  service_coverage: "service_coverage_default",
};
