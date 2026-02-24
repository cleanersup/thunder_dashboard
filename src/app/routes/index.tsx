import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute, FullScreenProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { ScrollToTop } from "@/shared/components/layout/ScrollToTop";

// ─── Loading fallback ────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Lazy pages (added progressively per feature phase) ─────────────────────
// Phase 3 — Auth
// const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage"));
// const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
// const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
// const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
// const OnboardingPage = lazy(() => import("@/features/auth/pages/OnboardingPage"));

// Phase 4 — Dashboard
// const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));

// Phase 5 — CRM
// ... add as implemented

/**
 * Central route definition for Thunder Dashboard.
 * All page components are lazy-loaded for code splitting.
 * Routes are uncommented progressively as each feature phase is completed.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* ── Public routes ─────────────────────────────────────────── */}
          {/* Phase 3: <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} /> */}
          {/* Phase 3: <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} /> */}
          {/* Phase 3: <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} /> */}
          {/* Phase 3: <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} /> */}

          {/* ── Protected routes ──────────────────────────────────────── */}
          {/* Phase 4: <Route path="/home" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /> */}

          {/* ── 404 fallback ──────────────────────────────────────────── */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
                <p className="text-muted-foreground">Page not found</p>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
