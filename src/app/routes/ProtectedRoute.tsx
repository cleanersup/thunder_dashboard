import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthGuard } from "@/shared/components/common/AuthGuard";
import { MainLayout } from "@/shared/components/layout/MainLayout";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { useAuth } from "@/shared/hooks/useAuth";

/**
 * Wraps authenticated pages with AuthGuard + MainLayout (responsive sidebar layout).
 *
 * requireSubscription (default true):
 *   Redirects to /subscription-plans when the user has no active subscription.
 *
 */
export function ProtectedRoute({
  children,
  requireSubscription = true,
}: {
  children: React.ReactNode;
  requireSubscription?: boolean;
}) {
  const { hasActiveSubscription, isLoading } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptionBootstrapComplete, setSubscriptionBootstrapComplete] = useState(false);
  const lastAuthUserIdRef = useRef<string | undefined>(undefined);

  // Reset bootstrap when the signed-in user changes (login / logout / account switch).
  useEffect(() => {
    const id = user?.id;
    if (id !== lastAuthUserIdRef.current) {
      lastAuthUserIdRef.current = id;
      setSubscriptionBootstrapComplete(false);
    }
  }, [user?.id]);

  // After subscription finishes loading once for this user, don't full-screen block on later refetches (e.g. tab focus).
  useEffect(() => {
    if (!isLoading) setSubscriptionBootstrapComplete(true);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    // Sin ninguna suscripción activa, a la pantalla de planes. El tier ya NO se
    // comprueba aquí: el menú se muestra completo y el plan se verifica al crear
    // o editar (`useUpgradeGate` / `WriteGate`).
    if (requireSubscription && !hasActiveSubscription) {
      navigate("/subscription-plans", { replace: true });
    }
  }, [hasActiveSubscription, isLoading, requireSubscription, navigate]);

  const showSubscriptionSpinner =
    requireSubscription && isLoading && !subscriptionBootstrapComplete;

  return (
    <AuthGuard>
      {showSubscriptionSpinner ? (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <MainLayout>{children}</MainLayout>
      )}
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
