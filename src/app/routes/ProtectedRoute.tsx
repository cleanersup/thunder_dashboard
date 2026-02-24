import { AuthGuard } from "@/shared/components/common/AuthGuard";
import { MainLayout } from "@/shared/components/layout/MainLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
}

/**
 * Wraps authenticated pages with AuthGuard + MainLayout (sidebar/bottom nav).
 * Use this for all standard internal pages.
 *
 * @param hideBottomNav - Hides the mobile bottom nav on detail/form pages
 */
export function ProtectedRoute({ children, hideBottomNav }: ProtectedRouteProps) {
  return (
    <AuthGuard>
      <MainLayout hideBottomNav={hideBottomNav}>{children}</MainLayout>
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
