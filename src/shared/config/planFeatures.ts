/**
 * Feature access configuration per subscription plan tier.
 * Mirrors swift-slate/src/config/planFeatures.ts — keep in sync.
 */

export type FeatureKey =
  | "estimates"
  | "invoices"
  | "crm"
  | "routes"
  | "requests"
  | "smart_map"
  | "employee"
  | "time_clock"
  | "walkthrough"
  | "contracts"
  | "tasks"
  | "jobs";

export type GatingPlanTier = "basic" | "essential" | "professional";

/**
 * Plan → feature matrix. Mirrors swift-slate/src/config/planFeatures.ts exactly.
 * Key-name differences vs swift: `routes` == swift `schedule`, `walkthrough` == swift `walkthroughs`.
 *
 * `contracts` unlocks at essential. Basic keeps a free window handled by
 * `useContractAccess`, which is what the upgrade gate consults for that feature —
 * the matrix only supplies the "minimum plan" label.
 *
 * `crm` is kept for parity with swift-slate but gates nothing: clients are
 * available on every plan.
 */
export const PLAN_FEATURES: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "invoices", "employee"],
  essential: [
    "estimates",
    "invoices",
    "employee",
    "requests",
    "walkthrough",
    "jobs",
    "routes",
    "contracts",
  ],
  professional: [
    "estimates",
    "invoices",
    "employee",
    "requests",
    "walkthrough",
    "jobs",
    "routes",
    "contracts",
    "crm",
    "tasks",
    "time_clock",
    "smart_map",
  ],
};

/** Human-readable feature names — used for upgrade prompts. */
export const FEATURE_NAMES: Record<FeatureKey, string> = {
  estimates: "Estimates",
  invoices: "Invoices",
  crm: "CRM",
  routes: "Schedule",
  requests: "Requests",
  smart_map: "Smart Map",
  employee: "Employee Management",
  time_clock: "Time Clock",
  walkthrough: "Walkthrough",
  contracts: "Contracts",
  tasks: "Tasks",
  jobs: "Jobs",
};

/**
 * Returns true if the given plan tier includes access to the feature.
 * Accepts the broader PlanTier from SubscriptionContext (including "free" / null).
 */
export function hasFeatureAccess(
  planTier: string | null | undefined,
  feature: FeatureKey
): boolean {
  if (!planTier || planTier === "free") return false;
  return PLAN_FEATURES[planTier as GatingPlanTier]?.includes(feature) ?? false;
}

/** Minimum plan tier that unlocks the feature (mirrors swift-slate). */
export function getMinimumPlanForFeature(feature: FeatureKey): GatingPlanTier {
  if (PLAN_FEATURES.basic.includes(feature)) return "basic";
  if (PLAN_FEATURES.essential.includes(feature)) return "essential";
  return "professional";
}
