import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// ─── Lazy-loaded pages (added per phase) ────────────────────────────────────
// Example: const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage"));

/**
 * Central route definitions for Thunder Dashboard.
 * All page components are lazy-loaded for optimal code splitting.
 * Routes are added progressively as each feature phase is implemented.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading…</div>}>
        <Routes>
          {/* Placeholder — routes added per feature phase */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<div className="p-8 text-center">404 — Page not found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
