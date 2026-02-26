import { MainLayout } from "@/shared/components/layout/MainLayout";

/**
 * Wraps authenticated pages with AuthGuard + MainLayout (responsive sidebar layout).
 * Use this for all standard internal pages.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: TEMP — auth disabled while staging is down. Revert: wrap MainLayout with <AuthGuard> again.
  return <MainLayout>{children}</MainLayout>;
}

/**
 * Wraps authenticated pages that need full-screen layout (no sidebar / no nav).
 * Use for fullscreen modals, onboarding, walkthroughs, etc.
 */
export function FullScreenProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: TEMP — auth disabled. Revert: wrap div with <AuthGuard> again.
  return <div className="min-h-screen w-full">{children}</div>;
}
