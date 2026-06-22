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
  | "jobs";

export type GatingPlanTier = "basic" | "essential" | "professional";

export const PLAN_FEATURES: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "walkthrough", "invoices", "crm", "employee"],
  essential: ["estimates", "walkthrough", "invoices", "crm", "routes", "requests", "employee", "contracts"],
  professional: [
    "estimates",
    "walkthrough",
    "invoices",
    "crm",
    "routes",
    "requests",
    "employee",
    "smart_map",
    "time_clock",
    "contracts",
    "jobs",
  ],
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
