import { useCallback, useMemo } from "react";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import {
  FEATURE_NAMES,
  getMinimumPlanForFeature,
  hasFeatureAccess,
  type FeatureKey,
  type GatingPlanTier,
} from "@/shared/config/planFeatures";

/**
 * Override de desarrollo para probar los gates de crear/editar sin tocar la base
 * de datos: `VITE_FORCE_PLAN_TIER=basic npm run dev`. Inerte en producción, con
 * el mismo patrón que `VITE_OWNER_COUNTRY` en `ownerCountry.service.ts`.
 *
 * `none` fuerza "sin ningún plan".
 */
const FORCED_TIER: GatingPlanTier | "none" | null = (() => {
  if (!import.meta.env.DEV) return null;
  const raw = import.meta.env.VITE_FORCE_PLAN_TIER;
  if (!raw) return null;
  const code = String(raw).trim().toLowerCase();
  if (code === "none") return "none";
  return code === "basic" || code === "essential" || code === "professional" ? code : null;
})();

export interface SubscriptionAccess {
  /** True when the current plan covers the feature. */
  hasAccess: (feature: FeatureKey) => boolean;
  /** Minimum plan tier that unlocks the feature. */
  getRequiredPlan: (feature: FeatureKey) => GatingPlanTier;
  /** Human-readable feature name, for upgrade copy. */
  getFeatureName: (feature: FeatureKey) => string;
  /** Resolved tier, or null when there is no usable plan. */
  currentPlanTier: GatingPlanTier | null;
  /** True while the subscription is still being resolved. */
  isLoading: boolean;
}

/**
 * Derived plan-access helpers on top of `useSubscription()`.
 *
 * The menu is shown in full to every plan, so this is only consulted when the
 * user tries to create or edit something — see `useUpgradeGate`.
 *
 * Prefer this over importing `hasFeatureAccess` directly: the callbacks are
 * memoized, so effects that depend on them don't re-run on every render.
 *
 * @returns Memoized access helpers for the current subscription
 * @example
 * const { hasAccess } = useSubscriptionAccess();
 * if (!hasAccess("jobs")) return;
 */
export function useSubscriptionAccess(): SubscriptionAccess {
  const { planTier, isLoading } = useSubscription();

  const currentPlanTier = useMemo<GatingPlanTier | null>(() => {
    if (FORCED_TIER === "none") return null;
    if (FORCED_TIER) return FORCED_TIER;
    if (!planTier || planTier === "free") return null;
    return planTier;
  }, [planTier]);

  const hasAccess = useCallback(
    (feature: FeatureKey) => hasFeatureAccess(currentPlanTier, feature),
    [currentPlanTier]
  );

  const getRequiredPlan = useCallback(
    (feature: FeatureKey) => getMinimumPlanForFeature(feature),
    []
  );

  const getFeatureName = useCallback((feature: FeatureKey) => FEATURE_NAMES[feature], []);

  return useMemo(
    () => ({ hasAccess, getRequiredPlan, getFeatureName, currentPlanTier, isLoading }),
    [hasAccess, getRequiredPlan, getFeatureName, currentPlanTier, isLoading]
  );
}
