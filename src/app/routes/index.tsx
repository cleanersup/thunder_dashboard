import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./ProtectedRoute";
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
// Phase 3 — Auth ✅
const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));

// Phase 4 — Dashboard ✅
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));

// Phase 5 — CRM ✅
const CRMPage = lazy(() => import("@/features/crm/pages/CRMPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/pages/NotificationsPage"));

// Phase 6 — Booking ✅
const BookingPage            = lazy(() => import("@/features/booking/pages/BookingPage").then((m) => ({ default: m.BookingPage })));
const EditBookingFormPage    = lazy(() => import("@/features/booking/pages/EditBookingFormPage").then((m) => ({ default: m.EditBookingFormPage })));
const PublicBookingFormPage  = lazy(() => import("@/features/booking/pages/PublicBookingFormPage").then((m) => ({ default: m.PublicBookingFormPage })));

// Phase 7 — Estimates ✅
const EstimatesPage                = lazy(() => import("@/features/estimates/pages/EstimatesPage").then((m) => ({ default: m.EstimatesPage })));
const CreateResidentialEstimatePage = lazy(() => import("@/features/estimates/pages/CreateResidentialEstimatePage").then((m) => ({ default: m.CreateResidentialEstimatePage })));
const CreateCommercialEstimatePage  = lazy(() => import("@/features/estimates/pages/CreateCommercialEstimatePage").then((m) => ({ default: m.CreateCommercialEstimatePage })));
const PublicEstimateViewPage        = lazy(() => import("@/features/estimates/pages/PublicEstimateViewPage").then((m) => ({ default: m.PublicEstimateViewPage })));

// Phase 8 — Invoices ✅
const InvoicesPage             = lazy(() => import("@/features/invoices/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })));
const CreateInvoicePage        = lazy(() => import("@/features/invoices/pages/CreateInvoicePage").then((m) => ({ default: m.CreateInvoicePage })));
const InvoicePreviewPage       = lazy(() => import("@/features/invoices/pages/InvoicePreviewPage").then((m) => ({ default: m.InvoicePreviewPage })));
const PublicInvoicePaymentPage = lazy(() => import("@/features/invoices/pages/PublicInvoicePaymentPage").then((m) => ({ default: m.PublicInvoicePaymentPage })));

// Phase 9 — Scheduling ✅
const RoutesPage          = lazy(() => import("@/features/scheduling/pages/RoutesPage").then((m) => ({ default: m.RoutesPage })));
const AddAppointmentPage  = lazy(() => import("@/features/scheduling/pages/AddAppointmentPage").then((m) => ({ default: m.AddAppointmentPage })));
const SmartMapPage        = lazy(() => import("@/features/scheduling/pages/SmartMapPage").then((m) => ({ default: m.SmartMapPage })));

// Phase 10 — Employees ✅
const EmployeesPage = lazy(() => import("@/features/employees/pages/EmployeesPage").then((m) => ({ default: m.EmployeesPage })));

// Phase 11 — Walkthroughs ✅
const WalkthroughsPage                = lazy(() => import("@/features/walkthroughs/pages/WalkthroughsPage").then((m) => ({ default: m.WalkthroughsPage })));
const AddWalkthroughPage              = lazy(() => import("@/features/walkthroughs/pages/AddWalkthroughPage").then((m) => ({ default: m.AddWalkthroughPage })));
const ResidentialWalkthroughFormPage  = lazy(() => import("@/features/walkthroughs/pages/ResidentialWalkthroughFormPage").then((m) => ({ default: m.ResidentialWalkthroughFormPage })));
const CommercialWalkthroughFormPage   = lazy(() => import("@/features/walkthroughs/pages/CommercialWalkthroughFormPage").then((m) => ({ default: m.CommercialWalkthroughFormPage })));

// Phase 12 — Settings ✅
const ProfilePage         = lazy(() => import("@/features/settings/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const EditProfilePage     = lazy(() => import("@/features/settings/pages/EditProfilePage").then((m) => ({ default: m.EditProfilePage })));
const EditCompanyInfoPage = lazy(() => import("@/features/settings/pages/EditCompanyInfoPage").then((m) => ({ default: m.EditCompanyInfoPage })));
const SecurityPage        = lazy(() => import("@/features/settings/pages/SecurityPage").then((m) => ({ default: m.SecurityPage })));
const ContactCardPage     = lazy(() => import("@/features/settings/pages/ContactCardPage").then((m) => ({ default: m.ContactCardPage })));
const ContractPage        = lazy(() => import("@/features/settings/pages/ContractPage").then((m) => ({ default: m.ContractPage })));
const PrivacyPage         = lazy(() => import("@/features/settings/pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));

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
          {/* Root redirect → auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* ── Public routes ─────────────────────────────────────────── */}
          {/* Phase 3 ✅ */}
          <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />

          {/* ── Protected routes ──────────────────────────────────────── */}
          {/* Phase 4 ✅ */}
          <Route path="/home" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* Phase 5 ✅ */}
          <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          {/* Phase 6 ✅ */}
          <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/booking/edit" element={<ProtectedRoute><EditBookingFormPage /></ProtectedRoute>} />
          {/* Public — no auth, must be after /booking/edit to avoid conflict */}
          <Route path="/booking/:userId" element={<PublicBookingFormPage />} />

          {/* Phase 7 ✅ */}
          <Route path="/estimates" element={<ProtectedRoute><EstimatesPage /></ProtectedRoute>} />
          <Route path="/estimates/new/residential" element={<ProtectedRoute><CreateResidentialEstimatePage /></ProtectedRoute>} />
          <Route path="/estimates/new/commercial"  element={<ProtectedRoute><CreateCommercialEstimatePage /></ProtectedRoute>} />
          {/* Public — no auth required */}
          <Route path="/public/estimate/:token" element={<PublicEstimateViewPage />} />

          {/* Phase 8 ✅ */}
          <Route path="/invoices"              element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
          <Route path="/invoices/new"          element={<ProtectedRoute><CreateInvoicePage /></ProtectedRoute>} />
          <Route path="/invoices/:id/edit"     element={<ProtectedRoute><CreateInvoicePage /></ProtectedRoute>} />
          <Route path="/invoices/:id/preview"  element={<ProtectedRoute><InvoicePreviewPage /></ProtectedRoute>} />
          {/* Public — no auth required */}
          <Route path="/invoice/payment/:id" element={<PublicInvoicePaymentPage />} />

          {/* Phase 9 ✅ */}
          <Route path="/create-route"           element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
          <Route path="/create-route/new"       element={<ProtectedRoute><AddAppointmentPage /></ProtectedRoute>} />
          <Route path="/create-route/:id/edit"  element={<ProtectedRoute><AddAppointmentPage /></ProtectedRoute>} />
          <Route path="/smart-map"              element={<ProtectedRoute><SmartMapPage /></ProtectedRoute>} />

          {/* Phase 10 ✅ */}
          <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />

          {/* Phase 11 ✅ */}
          <Route path="/walkthroughs"           element={<ProtectedRoute><WalkthroughsPage /></ProtectedRoute>} />
          <Route path="/walkthroughs/new"       element={<ProtectedRoute><AddWalkthroughPage /></ProtectedRoute>} />
          <Route path="/walkthroughs/:id/edit"  element={<ProtectedRoute><AddWalkthroughPage /></ProtectedRoute>} />
          {/* On-site assessment forms — authenticated */}
          <Route path="/walkthrough/residential/:id" element={<ProtectedRoute><ResidentialWalkthroughFormPage /></ProtectedRoute>} />
          <Route path="/walkthrough/commercial/:id"  element={<ProtectedRoute><CommercialWalkthroughFormPage /></ProtectedRoute>} />

          {/* Phase 12 ✅ */}
          <Route path="/profile"            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/edit-profile"       element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
          <Route path="/edit-company-info"  element={<ProtectedRoute><EditCompanyInfoPage /></ProtectedRoute>} />
          <Route path="/edit-security"      element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          <Route path="/contract"           element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
          {/* Public — no auth required */}
          <Route path="/privacy"             element={<PrivacyPage />} />
          <Route path="/contact-card/:userId" element={<ContactCardPage />} />

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
