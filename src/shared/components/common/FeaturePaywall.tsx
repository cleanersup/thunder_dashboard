import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import type { PlanTier } from "@/features/subscriptions/context/SubscriptionContext";

interface FeaturePaywallProps {
  /** Minimum plan tier required to access the feature */
  requiredTier: PlanTier;
  /** Feature name shown in the paywall message */
  featureName: string;
  /** Content to render when the user has access */
  children: React.ReactNode;
}

const TIER_ORDER: Record<NonNullable<PlanTier>, number> = {
  free: 0,
  basic: 1,
  essential: 2,
  professional: 3,
};

/**
 * Wraps a feature and renders a paywall if the user's plan tier is insufficient.
 * Reads subscription state from SubscriptionContext.
 *
 * @param requiredTier - Minimum plan needed to access the feature
 * @param featureName - Human-readable name of the gated feature
 * @param children - Content shown when the user has access
 *
 * @example
 * <FeaturePaywall requiredTier="essential" featureName="Smart Map">
 *   <SmartMapView />
 * </FeaturePaywall>
 */
export function FeaturePaywall({ requiredTier, featureName, children }: FeaturePaywallProps) {
  const { hasActiveSubscription, planTier } = useSubscription();
  const navigate = useNavigate();

  const userTierLevel = planTier ? TIER_ORDER[planTier] ?? 0 : 0;
  const requiredTierLevel = requiredTier ? TIER_ORDER[requiredTier] ?? 0 : 0;
  const hasAccess = hasActiveSubscription && userTierLevel >= requiredTierLevel;

  if (hasAccess) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Upgrade to access {featureName}</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        This feature requires the <strong>{requiredTier}</strong> plan or higher.
        Upgrade your subscription to unlock it.
      </p>
      <Button onClick={() => navigate("/subscription-plans")}>View Plans</Button>
    </div>
  );
}
