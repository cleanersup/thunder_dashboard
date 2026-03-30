import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { ScrollToTop } from "@/shared/components/layout/ScrollToTop";
import { ErrorBoundary } from "@/shared/components/common/ErrorBoundary";

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
const StripeReturnPage         = lazy(() => import("@/features/invoices/pages/StripeReturnPage").then((m) => ({ default: m.StripeReturnPage })));

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

// Phase 19 — Time Clock ✅
const TimeClockPage = lazy(() =>
  import("@/features/time-clock/pages/TimeClockPage").then((m) => ({ default: m.TimeClockPage }))
);

// Phase 14 — Contracts ✅ (CON-1 skeleton)
const ContractsPage        = lazy(() => import("@/features/contracts/pages/ContractsPage").then((m) => ({ default: m.ContractsPage })));
const CreateContractPage   = lazy(() => import("@/features/contracts/pages/CreateContractStep1Page").then((m) => ({ default: m.CreateContractStep1Page })));
const PublicContractPage   = lazy(() => import("@/features/contracts/pages/PublicContractPage").then((m) => ({ default: m.PublicContractPage })));

// Phase 13 — Subscriptions ✅ (web billing pending RC Web Billing configuration)
const SubscriptionPlansPage = lazy(() =>
  import("@/features/subscriptions/pages/SubscriptionPlansPage").then((m) => ({ default: m.SubscriptionPlansPage }))
);

// Phase 12 — Settings ✅
const ProfilePage         = lazy(() => import("@/features/settings/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const EditProfilePage     = lazy(() => import("@/features/settings/pages/EditProfilePage").then((m) => ({ default: m.EditProfilePage })));
const EditCompanyInfoPage = lazy(() => import("@/features/settings/pages/EditCompanyInfoPage").then((m) => ({ default: m.EditCompanyInfoPage })));
const SecurityPage        = lazy(() => import("@/features/settings/pages/SecurityPage").then((m) => ({ default: m.SecurityPage })));
const ContactCardPage     = lazy(() => import("@/features/settings/pages/ContactCardPage").then((m) => ({ default: m.ContactCardPage })));
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
      <ErrorBoundary>
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
          <Route path="/crm" element={<ProtectedRoute requireFeature="crm"><CRMPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute requireSubscription={false}><NotificationsPage /></ProtectedRoute>} />

          {/* Phase 6 ✅ */}
          <Route path="/booking" element={<ProtectedRoute requireFeature="booking"><BookingPage /></ProtectedRoute>} />
          <Route path="/booking/edit" element={<ProtectedRoute requireFeature="booking"><EditBookingFormPage /></ProtectedRoute>} />
          {/* Public — no auth, must be after /booking/edit to avoid conflict */}
          <Route path="/booking/:userId" element={<PublicBookingFormPage />} />

          {/* Phase 7 ✅ */}
          <Route path="/estimates" element={<ProtectedRoute requireFeature="estimates"><EstimatesPage /></ProtectedRoute>} />
          <Route path="/estimates/new/residential" element={<ProtectedRoute requireFeature="estimates"><CreateResidentialEstimatePage /></ProtectedRoute>} />
          <Route path="/estimates/new/commercial"  element={<ProtectedRoute requireFeature="estimates"><CreateCommercialEstimatePage /></ProtectedRoute>} />
          {/* Public — no auth required */}
          <Route path="/public/estimate/:token" element={<PublicEstimateViewPage />} />

          {/* Phase 8 ✅ */}
          <Route path="/invoices"              element={<ProtectedRoute requireFeature="invoices"><InvoicesPage /></ProtectedRoute>} />
          <Route path="/invoices/new"          element={<ProtectedRoute requireFeature="invoices"><CreateInvoicePage /></ProtectedRoute>} />
          <Route path="/invoices/:id/edit"     element={<ProtectedRoute requireFeature="invoices"><CreateInvoicePage /></ProtectedRoute>} />
          <Route path="/invoices/:id/preview"  element={<ProtectedRoute requireFeature="invoices"><InvoicePreviewPage /></ProtectedRoute>} />
          {/* Public — no auth required */}
          <Route path="/invoice/payment/:id" element={<PublicInvoicePaymentPage />} />
          <Route path="/stripe/return" element={<ProtectedRoute requireSubscription={false}><StripeReturnPage /></ProtectedRoute>} />

          {/* Phase 9 ✅ */}
          <Route path="/create-route"           element={<ProtectedRoute requireFeature="routes"><RoutesPage /></ProtectedRoute>} />
          <Route path="/create-route/:id/edit"  element={<ProtectedRoute requireFeature="routes"><AddAppointmentPage /></ProtectedRoute>} />
          <Route path="/smart-map"              element={<ProtectedRoute requireFeature="smart_map"><SmartMapPage /></ProtectedRoute>} />

          {/* Phase 10 ✅ */}
          <Route path="/employees" element={<ProtectedRoute requireFeature="employee"><EmployeesPage /></ProtectedRoute>} />

          {/* Phase 11 ✅ */}
          <Route path="/walkthroughs"           element={<ProtectedRoute><WalkthroughsPage /></ProtectedRoute>} />
          <Route path="/walkthroughs/new"       element={<ProtectedRoute><AddWalkthroughPage /></ProtectedRoute>} />
          <Route path="/walkthroughs/:id/edit"  element={<ProtectedRoute><AddWalkthroughPage /></ProtectedRoute>} />
          {/* On-site assessment forms — authenticated */}
          <Route path="/walkthrough/residential/:id" element={<ProtectedRoute><ResidentialWalkthroughFormPage /></ProtectedRoute>} />
          <Route path="/walkthrough/commercial/:id"  element={<ProtectedRoute><CommercialWalkthroughFormPage /></ProtectedRoute>} />

          {/* Phase 19 ✅ */}
          <Route path="/time-clock" element={<ProtectedRoute requireFeature="time_clock"><TimeClockPage /></ProtectedRoute>} />

          {/* Phase 13 ✅ */}
          <Route path="/subscription-plans" element={<ProtectedRoute requireSubscription={false}><SubscriptionPlansPage /></ProtectedRoute>} />

          {/* Phase 14 ✅ — Contracts */}
          <Route path="/contracts"          element={<ProtectedRoute requireSubscription={false}><ContractsPage /></ProtectedRoute>} />
          <Route path="/contracts/new"      element={<ProtectedRoute requireSubscription={false}><CreateContractPage /></ProtectedRoute>} />
          <Route path="/contracts/:id/edit" element={<ProtectedRoute requireSubscription={false}><CreateContractPage /></ProtectedRoute>} />
          {/* Legacy redirect */}
          <Route path="/contract"           element={<Navigate to="/contracts" replace />} />
          {/* Public — no auth required */}
          <Route path="/public/contract/:token" element={<PublicContractPage />} />

          {/* Phase 12 ✅ */}
          <Route path="/profile"            element={<ProtectedRoute requireSubscription={false}><ProfilePage /></ProtectedRoute>} />
          <Route path="/edit-profile"       element={<ProtectedRoute requireSubscription={false}><EditProfilePage /></ProtectedRoute>} />
          <Route path="/edit-company-info"  element={<ProtectedRoute requireSubscription={false}><EditCompanyInfoPage /></ProtectedRoute>} />
          <Route path="/edit-security"      element={<ProtectedRoute requireSubscription={false}><SecurityPage /></ProtectedRoute>} />
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
      </ErrorBoundary>
    </BrowserRouter>
  );
}
