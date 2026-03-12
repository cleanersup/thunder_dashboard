import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGuard } from "@/shared/components/common/AuthGuard";
import { MainLayout } from "@/shared/components/layout/MainLayout";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { hasFeatureAccess, type FeatureKey } from "@/shared/config/planFeatures";

/**
 * Wraps authenticated pages with AuthGuard + MainLayout (responsive sidebar layout).
 *
 * requireSubscription (default true):
 *   Redirects to /subscription-plans when the user has no active subscription.
 *
 * requireFeature:
 *   Redirects to /subscription-plans when the user's plan tier does not include
 *   the specified feature (e.g. "smart_map" requires professional tier).
 *   Implies requireSubscription check as well.
 */
export function ProtectedRoute({
  children,
  requireSubscription = true,
  requireFeature,
}: {
  children: React.ReactNode;
  requireSubscription?: boolean;
  requireFeature?: FeatureKey;
}) {
  const { hasActiveSubscription, planTier, isLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // Step 1: active subscription check
    if (requireSubscription && !hasActiveSubscription) {
      navigate("/subscription-plans", { replace: true });
      return;
    }

    // Step 2: tier feature check
    if (requireFeature && !hasFeatureAccess(planTier, requireFeature)) {
      navigate("/subscription-plans", { replace: true });
    }
  }, [hasActiveSubscription, planTier, isLoading, requireSubscription, requireFeature, navigate]);

  // Show spinner while resolving subscription/tier to avoid content flash
  if ((requireSubscription || !!requireFeature) && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}

/**
 * Wraps authenticated pages that need full-screen layout (no sidebar / no nav).
 * Use for fullscreen modals, onboarding, walkthroughs, etc.
 */
export function FullScreenProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen w-full">{children}</div>
    </AuthGuard>
  );
}
