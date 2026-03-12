/**
 * Feature access configuration per subscription plan tier.
 * Mirrors swift-slate/src/config/planFeatures.ts — keep in sync.
 */

export type FeatureKey =
  | "estimates"
  | "invoices"
  | "crm"
  | "routes"
  | "booking"
  | "smart_map"
  | "employee"
  | "time_clock";

export type GatingPlanTier = "basic" | "essential" | "professional";

export const PLAN_FEATURES: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "invoices", "crm", "employee"],
  essential: ["estimates", "invoices", "crm", "routes", "booking", "employee"],
  professional: [
    "estimates",
    "invoices",
    "crm",
    "routes",
    "booking",
    "employee",
    "smart_map",
    "time_clock",
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
