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
