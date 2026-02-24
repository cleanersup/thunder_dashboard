# Thunder Dashboard — Plan Maestro de Migración Web

> **Estado actual:** 🟢 En progreso
> **Fase activa:** Fase 4 — Dashboard
> **Última actualización:** 2026-02-24
> **Sesión anterior:** F0 + F1 + F2 + F3 completas y pusheadas a develop.

---

## Proyectos Relacionados

| Rol | Ruta | Descripción |
|-----|------|-------------|
| App móvil (origen) | `/Users/diegoparedes/Documents/Desarrollo/swift-slate` | App actual Capacitor. Fuente de lógica y features |
| Referencia UX/UI | `/Users/diegoparedes/Documents/Desarrollo/thunder-web-version` | Versión web previa del jefe. Fuente de diseño y componentes |
| **Este proyecto** | `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard` | Nueva SPA web responsive |

---

## Contexto y Objetivo

Migrar la app móvil Thunder Pro (React + Capacitor) a una SPA web responsive, construida desde cero con:
- Arquitectura **feature-based (vertical slices)** siguiendo principios **SOLID**
- UX/UI tomado de `thunder-web-version`
- Lógica de negocio tomada de `swift-slate`
- **Mismo backend Supabase** (staging + producción, sin cambios)
- **Cero dependencias de Capacitor**
- Funciones y métodos documentados con **JSDoc paramétrico**
- Mínima duplicación de código
- **CI/CD via GitHub Actions → AWS**
- Repositorio: `thunder_dashboard`

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 (lazy loading) |
| Server state | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| UI components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS v3 |
| Auth / Backend | Supabase (mismo de swift-slate) |
| Mapas | Mapbox GL (web-compatible) |
| PDF | jsPDF (Blob download, sin mobile helper) |
| Gráficos | Recharts |
| Notificaciones | Sonner |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Prettier |
| CI/CD | GitHub Actions → AWS |

---

## Reemplazos Mobile → Web

| Mobile (Capacitor) | Reemplazo Web | Servicio Abstracto |
|-------------------|---------------|-------------------|
| `@capacitor/preferences` | `localStorage` | `StorageService` |
| `@capacitor/filesystem` | Blob URL download | `FileService` |
| `@capacitor/geolocation` | `navigator.geolocation` | `GeolocationService` |
| `@capacitor/browser` | `window.open()` | directo |
| `@capacitor/share` | Web Share API + clipboard fallback | `ShareService` |
| Deep links `thunderpro://` | URL params / redirect estándar | query params |
| `@revenuecat/purchases-capacitor` | Stripe Billing | ver Fase 13 |
| `Capacitor.isNativePlatform()` | eliminado | — |

---

## Arquitectura de Suscripciones (⚠️ Decisión pendiente)

**Problema:** usuario que paga en web debe tener acceso en iOS/Android también.

**Recomendación:** Stripe Billing para web + Supabase como fuente de verdad cross-platform:

```
Mobile purchase  → RevenueCat     → webhook → Supabase (subscriptions table)
Web purchase     → Stripe Billing → webhook → Supabase (subscriptions table)
App (web+mobile) ←──────────────── lee de Supabase
```

La arquitectura actual ya lee de Supabase (`SubscriptionContext`), por lo que esto es una extensión natural. RevenueCat sigue activo para iOS/Android. Para web se agrega Stripe Billing + edge function webhook.

**Tier web-only:** Si existe un plan exclusivo de web, se agrega como `plan_tier: 'web_pro'` en Supabase gestionado solo por Stripe Billing.

### Decisiones pendientes de negocio (Fase 13)
- [ ] ¿Confirmamos Stripe Billing como proveedor de suscripciones web?
- [ ] ¿Existe tier web-only? Si sí: nombre, precio y features incluidas

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── App.tsx                    # Componente raíz
│   ├── providers.tsx              # Composición de todos los providers
│   └── routes/
│       ├── index.tsx              # Definición centralizada de rutas (lazy)
│       ├── PublicRoute.tsx        # Wrapper ruta pública
│       └── ProtectedRoute.tsx     # Wrapper ruta autenticada + AuthGuard
│
├── features/                      # Módulos de negocio (vertical slices)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── pages/
│   ├── dashboard/
│   ├── crm/
│   │   ├── clients/
│   │   └── leads/
│   ├── estimates/
│   ├── invoices/
│   ├── scheduling/                # Rutas + Appointments + SmartMap
│   ├── employees/
│   ├── employee-portal/
│   ├── tasks/
│   ├── booking/
│   ├── walkthroughs/
│   ├── subscriptions/
│   └── settings/                  # Profile, Company, Security
│
├── shared/
│   ├── components/
│   │   ├── ui/                    # Primitivos shadcn (no modificar directamente)
│   │   ├── layout/                # MainLayout, Sidebar, Header, BottomNav
│   │   └── common/                # FeaturePaywall, PageHeader, DataTable, etc.
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   └── useToast.ts
│   ├── services/
│   │   ├── storage.service.ts
│   │   ├── geolocation.service.ts
│   │   ├── pdf.service.ts
│   │   ├── share.service.ts
│   │   └── file.service.ts
│   ├── types/
│   └── utils/
│       └── errorHandler.ts
│
├── integrations/
│   └── supabase/
│       ├── client.ts              # Supabase client (web-only)
│       └── types.ts               # Tipos auto-generados desde DB
│
└── config/
    ├── env.ts                     # Variables de entorno tipadas
    ├── subscription.config.ts
    └── maps.config.ts
```

**Regla por feature module:**
```
feature/
├── components/   → Componentes específicos del feature
├── hooks/        → Custom hooks (useClients, useCreateClient…)
├── services/     → Lógica de negocio + llamadas a Supabase
├── schemas/      → Schemas Zod de validación
├── types/        → Tipos TypeScript del feature
└── pages/        → Thin page components (solo composición)
```

---

## Convenciones de Código

- Cada función/método documentado con JSDoc: `@param`, `@returns`, `@throws`, `@example`
- Servicios dependen de interfaces/tipos, no de implementaciones (DIP)
- Page components son "thin": solo composición de hooks + componentes
- Lógica de negocio en services, no en componentes
- Queries con React Query: keys consistentes `['feature', id]`
- No platform detection (`Capacitor.isNativePlatform()` → eliminado)
- Imports con path aliases: `@/features/...`, `@/shared/...`, `@/config/...`

---

## CI/CD

```yaml
develop → push → lint + test → deploy a AWS Staging
main    → merge → lint + test → deploy a AWS Producción
PR      → preview build + checks automáticos
```

**Pendiente definir (Fase 17):**
- [ ] ¿Tipo de hosting AWS? (S3+CloudFront / ECS / EC2 / Amplify)
- [ ] ¿Dominio para la versión web? (ej: `app.thunderpro.co`)

---

## Preguntas Pendientes de Confirmar

| # | Pregunta | Bloquea Fase |
|---|----------|-------------|
| 1 | ¿Tipo de hosting AWS? (S3+CloudFront, ECS, etc.) | 17 |
| 2 | ¿Dominio para la versión web? | 17 |
| 3 | ¿Confirmamos Stripe Billing para suscripciones web? | 13 |
| 4 | ¿Existe tier web-only? ¿Qué features incluye? | 13 |
| 5 | ¿thunder-web-version tiene diseño para TODAS las páginas? | 3–12 |

---

## Orden de Implementación

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F14 → F15 → F13 → F16 → F17
```

> F13 (suscripciones) requiere decisiones de negocio → se puede avanzar en paralelo con últimas fases de features.

---

---

# CHECKLIST POR FASES

> Marca con `[x]` cuando un ítem esté completo.

---

## FASE 0 — Setup del Proyecto
> Estado: 🟡 Parcialmente completa (AWS/Secrets pendientes de otro equipo)

- [x] Inicializar repo git en `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`
- [x] Crear repositorio `thunder_dashboard` en GitHub con branches `main` y `develop`
- [x] Scaffolding: Vite + React 18 + TypeScript (creado manualmente)
- [x] Configurar Tailwind CSS v3 + PostCSS
- [x] Instalar y configurar shadcn/ui (52 componentes copiados de thunder-web-version)
- [x] Configurar ESLint + Prettier
- [x] Configurar Vitest + React Testing Library
- [x] Crear estructura de carpetas completa (feature-based)
- [x] Configurar `tsconfig.json` con path aliases (`@/features`, `@/shared`, `@/config`)
- [x] Crear `.env.example` con todas las variables + `config/env.ts` tipado
- [x] Crear `.github/workflows/ci.yml` (lint + type-check + test)
- [x] Crear `.github/workflows/deploy-staging.yml`
- [x] Crear `.github/workflows/deploy-production.yml`
- [ ] ⏳ Configurar AWS hosting — pendiente confirmar tipo (S3+CloudFront / ECS / otro)
- [ ] ⏳ Configurar GitHub Secrets — pendiente (lo hace otro miembro del equipo)
- [ ] ⏳ Branch protection rules + environments — pendiente (lo hace otro miembro del equipo)
- [ ] ⏳ Verificar deploy end-to-end — pendiente hasta AWS configurado

---

## FASE 1 — Core Infrastructure
> Estado: ✅ Completa

- [x] Integrar Supabase client (`integrations/supabase/client.ts`) — web-only, sin Capacitor adapter
- [x] Copiar `integrations/supabase/types.ts` de swift-slate
- [x] Implementar `shared/services/storage.service.ts` (abstracción localStorage)
- [x] Implementar auth session persistence con localStorage
- [x] Crear `app/providers.tsx` (QueryClient, SubscriptionContext, Toaster)
- [x] Crear `app/routes/index.tsx` con lazy loading y estructura por fases
- [x] Implementar `ProtectedRoute`, `FullScreenProtectedRoute` y `PublicRoute`
- [x] Adaptar layout de thunder-web-version: `MainLayout`, `DesktopSidebar`, `DesktopHeader`, `BottomNav`
- [x] Responsive: sidebar en desktop (≥1024px), bottom nav en mobile
- [x] Implementar `shared/components/common/FeaturePaywall.tsx`
- [x] Crear `shared/hooks/useAuth.ts`
- [x] Crear `shared/hooks/useProfile.ts`
- [x] Crear `shared/hooks/useIsMobile.ts`
- [x] Implementar `SubscriptionContext` (sin RevenueCat, Supabase como fuente de verdad)
- [x] `FloatingActionButtons` + `ScrollToTop`
- [ ] ⏳ Verificar: login → dashboard → logout (pendiente hasta Fase 3 con AuthPage real)

---

## FASE 2 — Sistema de Diseño UI
> Estado: ✅ Completa

- [x] Copiar todos los componentes shadcn/ui de thunder-web-version → `shared/components/ui/` (52 componentes)
- [x] Unificar `tailwind.config.ts` (tokens de color, tipografía, border-radius, animaciones)
- [x] Copiar y adaptar `index.css` con variables CSS de theming (light + dark mode)
- [x] Implementar `PageHeader` — título, subtítulo, back button, action slot
- [x] Implementar `DataTable` — tipado genérico, búsqueda, paginación, skeleton, empty state
- [x] Implementar `ConfirmDialog` — AlertDialog reutilizable para acciones destructivas
- [x] Implementar `EmptyState` — icono, título, descripción, CTA opcional
- [x] Implementar `LoadingSpinner` — sm/md/lg + fullScreen
- [x] Implementar `SkeletonCard` + `StatCardSkeleton`, `ChartSkeleton`, `ActivitySkeleton`
- [x] Barrel exports: `common/index.ts` + `layout/index.ts`
- [x] Corregidos todos los imports shadcn: `@/components/ui` → `@/shared/components/ui` (47 archivos)
- [x] Corregido `@/lib/utils` → `@/shared/utils/cn`
- [x] TypeScript typecheck: 0 errores

---

## FASE 3 — Flujo de Autenticación
> Estado: ✅ Completa

**Páginas:** AuthPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage

- [x] `features/auth/services/authService.ts` — `login`, `signUp`, `logout`, `sendPasswordResetEmail`, `updatePassword`, `resendVerificationEmail` (JSDoc completo)
- [x] `features/auth/schemas/loginSchema.ts`, `signupSchema.ts`, `resetPasswordSchema.ts` (Zod + RHF)
- [x] `features/auth/hooks/useLogin.ts`, `useSignup.ts`, `usePasswordReset.ts` (React Query mutations)
- [x] `features/auth/components/AuthBackground` — dark gradient, grid, cyan orbs
- [x] `features/auth/components/FloatingLabelInput` — reutilizable con error slot y right slot
- [x] `features/auth/components/LoginForm`
- [x] `features/auth/components/SignupForm` (PhoneInput, US state selector, referral code, terms)
- [x] `features/auth/pages/AuthPage` — login/signup toggle, UX de thunder-web-version
- [x] `features/auth/pages/ForgotPasswordPage`
- [x] `features/auth/pages/ResetPasswordPage` — valida sesión de reset link
- [x] `features/auth/pages/VerifyEmailPage` — OTP 6-digit + resend
- [x] `shared/components/ui/phone-input.tsx` + `input-otp.tsx` agregados
- [x] Assets: `thunder-logo.png`, `thunder-logo-white.png`
- [x] Sin Capacitor.Preferences — todo vía localStorage (Supabase client)
- [x] Rutas habilitadas: `/auth`, `/forgot-password`, `/reset-password`, `/verify-email`
- [ ] ⏳ Test: ciclo completo signup → verify email → login → logout (pendiente prueba manual)

---

## FASE 4 — Dashboard
> Estado: 🔴 Pendiente

- [ ] `features/dashboard/services/dashboardService.ts` — stats: invoiced, pending, paid, active clients (JSDoc)
- [ ] `features/dashboard/hooks/useDashboardStats.ts`
- [ ] `features/dashboard/components/StatsCard`
- [ ] `features/dashboard/components/RevenueChart` (Recharts)
- [ ] `features/dashboard/components/ActivityFeed`
- [ ] `features/dashboard/components/UpcomingRoutes`
- [ ] `features/dashboard/pages/DashboardPage` — aplica diseño de thunder-web-version
- [ ] Responsive: grid en desktop, stack en mobile

---

## FASE 5 — CRM (Clientes, Leads, Tareas, Notificaciones)
> Estado: 🔴 Pendiente

### Clientes
- [ ] `features/crm/clients/services/clientsService.ts` (JSDoc)
- [ ] `features/crm/clients/hooks/useClients.ts`, `useClient.ts`, `useCreateClient.ts`, `useUpdateClient.ts`, `useDeleteClient.ts`
- [ ] `features/crm/clients/schemas/clientSchema.ts`
- [ ] `features/crm/clients/components/ClientsTable`
- [ ] `features/crm/clients/components/ClientForm` (add/edit unificado)
- [ ] `features/crm/clients/components/ClientDetailsPanel`
- [ ] `features/crm/clients/pages/ClientsPage`
- [ ] `features/crm/clients/pages/ClientDetailPage`

### Leads
- [ ] `features/crm/leads/services/leadsService.ts` (JSDoc)
- [ ] `features/crm/leads/hooks/useLeads.ts`, `useLead.ts`, `useCreateLead.ts`, `useUpdateLead.ts`, `useDeleteLead.ts`
- [ ] `features/crm/leads/schemas/leadSchema.ts`
- [ ] `features/crm/leads/components/LeadsTable`
- [ ] `features/crm/leads/components/LeadForm` (add/edit unificado)
- [ ] `features/crm/leads/components/LeadDetailsPanel`
- [ ] `features/crm/leads/pages/LeadsPage`
- [ ] `features/crm/leads/pages/LeadDetailPage`

### Tareas
- [ ] `features/tasks/services/tasksService.ts` (JSDoc)
- [ ] `features/tasks/hooks/useTasks.ts`, `useTask.ts`, `useCreateTask.ts`, `useUpdateTask.ts`
- [ ] `features/tasks/schemas/taskSchema.ts`
- [ ] `features/tasks/components/TasksList`, `TaskForm`, `TaskDetailPanel`
- [ ] `features/tasks/pages/TasksPage`, `TaskDetailPage`

### Notificaciones
- [ ] `features/notifications/services/notificationsService.ts` (JSDoc)
- [ ] Real-time subscription via Supabase channel
- [ ] `features/notifications/hooks/useNotifications.ts`
- [ ] `features/notifications/components/NotificationsList`, `NotificationBell`
- [ ] `features/notifications/pages/NotificationsPage`

---

## FASE 6 — Booking
> Estado: 🔴 Pendiente

- [ ] `features/booking/services/bookingService.ts` (JSDoc)
- [ ] `features/booking/hooks/useBookingForms.ts`, `usePublicBooking.ts`
- [ ] `features/booking/schemas/bookingSchema.ts`
- [ ] `features/booking/components/BookingFormsList`, `BookingFormEditor`
- [ ] `features/booking/components/PublicBookingForm`
- [ ] `features/booking/pages/BookingPage`, `EditBookingFormPage`
- [ ] `features/booking/pages/PublicBookingFormPage` (`/booking/:userId`) — sin auth, layout propio
- [ ] Test: compartir link y completar booking desde browser externo

---

## FASE 7 — Estimates
> Estado: 🔴 Pendiente

- [ ] `features/estimates/services/estimatesService.ts` (JSDoc)
- [ ] `features/estimates/hooks/useEstimates.ts`, `useCreateEstimate.ts`, `useEstimateDetails.ts`
- [ ] `features/estimates/schemas/residentialEstimateSchema.ts`, `commercialEstimateSchema.ts`
- [ ] `features/estimates/components/EstimatesList`
- [ ] `features/estimates/components/ResidentialEstimateForm`
- [ ] `features/estimates/components/CommercialEstimateForm`
- [ ] `features/estimates/components/EstimatePreview`
- [ ] Páginas internas: `EstimatesPage`, `CreateResidentialEstimatePage`, `CreateCommercialEstimatePage`, `EstimateDetailPage`
- [ ] Página pública: `PublicEstimateViewPage` (`/view/estimate/:token`) — sin auth
- [ ] `shared/services/share.service.ts` — Web Share API + clipboard fallback
- [ ] `shared/services/pdf.service.ts` — Blob download (eliminar `pdfMobileHelper.ts`)
- [ ] Test: crear estimado → email → cliente abre link → acepta

---

## FASE 8 — Invoices
> Estado: 🔴 Pendiente

- [ ] `features/invoices/services/invoicesService.ts` (JSDoc)
- [ ] `features/invoices/hooks/useInvoices.ts`, `useCreateInvoice.ts`, `useInvoiceDetails.ts`
- [ ] `features/invoices/schemas/invoiceSchema.ts`
- [ ] `features/invoices/components/InvoicesList`, `InvoiceForm`, `InvoicePreview`
- [ ] Páginas internas: `InvoicesPage`, `CreateInvoicePage`, `EditInvoicePage`, `InvoiceDetailPage`
- [ ] Páginas públicas: `InvoicePaymentPage` (`/invoice/payment/:id`), `PaymentSuccessPage`, `PaymentCancelledPage`
- [ ] `features/invoices/hooks/useStripeConnect.ts` — usa `window.open()` (sin `@capacitor/browser`)
- [ ] Stripe Connect redirect: reemplazar `thunderpro://stripe/return` → `/stripe-return?account_id=xxx`
- [ ] `features/invoices/pages/StripeReturnPage` — maneja redirect OAuth de Stripe
- [ ] Test: crear invoice → cliente paga → estado actualiza en DB

---

## FASE 9 — Scheduling (Rutas, Citas, SmartMap)
> Estado: 🔴 Pendiente

- [ ] `features/scheduling/services/routesService.ts`, `appointmentsService.ts` (JSDoc)
- [ ] `features/scheduling/hooks/useRoutes.ts`, `useCreateRoute.ts`, `useSmartMap.ts`
- [ ] `shared/services/geolocation.service.ts` — `navigator.geolocation` promisificado
- [ ] Mapbox GL mantenido (web-compatible sin cambios)
- [ ] `features/scheduling/components/RoutesList`, `CreateRouteForm`, `RouteMap`
- [ ] `features/scheduling/components/AppointmentCard`, `SmartMapView`
- [ ] Páginas: `RoutesPage`, `CreateRoutePage`, `RouteInfoPage`, `AppointmentDetailPage`, `SmartMapPage`
- [ ] Test: crear ruta → agregar stops → visualizar en mapa

---

## FASE 10 — Employees + Employee Portal
> Estado: 🔴 Pendiente

### Gestión Interna
- [ ] `features/employees/services/employeesService.ts` (JSDoc)
- [ ] `features/employees/hooks/useEmployees.ts`, `useEmployeeDetails.ts`, `useShiftEdit.ts`
- [ ] `features/employees/components/EmployeesList`, `EmployeeForm`, `EmployeeDetails`
- [ ] `features/employees/components/TimelineView`, `ClockInOutPanel`, `ShiftDetails`, `ShiftEditModal`
- [ ] Páginas: `EmployeesPage`, `AddEmployeePage`, `EditEmployeePage`, `EmployeeDetailPage`, `TimeClockPage`, `ShiftDetailPage`

### Employee Portal (acceso separado)
- [ ] `features/employee-portal/services/employeePortalService.ts` (JSDoc)
- [ ] Layout propio para el portal (sin MainLayout principal)
- [ ] Páginas: `EmployeeLoginPage`, `EmployeeDashboardPage`, `EmployeeShiftDetailPage`, `EmployeeHistoryDetailPage`

---

## FASE 11 — Walkthroughs
> Estado: 🔴 Pendiente

- [ ] `features/walkthroughs/services/walkthroughsService.ts` (JSDoc)
- [ ] `features/walkthroughs/hooks/useWalkthroughs.ts`, `useCreateWalkthrough.ts`
- [ ] `features/walkthroughs/schemas/` — residencial y comercial
- [ ] Páginas públicas: `ResidentialWalkthroughFormPage`, `CommercialWalkthroughFormPage`
- [ ] Páginas internas: `WalkthroughsPage`, `AddWalkthroughPage`, `WalkthroughDetailPage`, `EditWalkthroughPage`
- [ ] Reemplazar share → `ShareService`

---

## FASE 12 — Settings (Perfil, Empresa, Seguridad)
> Estado: 🔴 Pendiente

- [ ] `features/settings/services/settingsService.ts` (JSDoc)
- [ ] `features/settings/hooks/useProfile.ts`, `useCompanyInfo.ts`
- [ ] Páginas: `ProfilePage`, `EditProfilePage`, `EditCompanyInfoPage`, `SecurityPage`
- [ ] Página pública: `ContactCardPage` (`/contact-card/:userId`)
- [ ] `ContractPage`, `PrivacyPage`

---

## FASE 13 — Suscripciones ⚠️ Requiere decisiones de negocio
> Estado: 🟡 Bloqueada — espera confirmación

- [ ] **[DECISIÓN]** Confirmar Stripe Billing para suscripciones web
- [ ] **[DECISIÓN]** Definir si existe tier web-only y sus features
- [ ] `features/subscriptions/services/subscriptionsService.ts` (JSDoc)
- [ ] `features/subscriptions/services/stripeCheckoutService.ts` — crea sesión de checkout
- [ ] Supabase edge function: webhook Stripe → actualiza tabla `subscriptions`
- [ ] `features/subscriptions/hooks/useSubscription.ts` (lee de Supabase)
- [ ] `features/subscriptions/components/SubscriptionPlans`, `PlanCard`, `ManageSubscription`
- [ ] Páginas: `SubscriptionPlansPage`, `ManageSubscriptionPage`
- [ ] Eliminar toda referencia a `@revenuecat/purchases-capacitor`
- [ ] Mantener lectura de estado desde Supabase (compatible con compras móviles)
- [ ] `FeaturePaywall` continúa sin cambios de interfaz

---

## FASE 14 — Servicios Transversales
> Estado: 🔴 Pendiente

- [ ] `shared/services/storage.service.ts` — JSDoc + tests
- [ ] `shared/services/geolocation.service.ts` — promisify `navigator.geolocation`, JSDoc + tests
- [ ] `shared/services/pdf.service.ts` — Blob download + share fallback, JSDoc + tests
- [ ] `shared/services/share.service.ts` — Web Share API + clipboard fallback, JSDoc + tests
- [ ] `shared/services/file.service.ts` — download helper, JSDoc + tests
- [ ] Auditar: **cero imports de `@capacitor/*`** en el proyecto
- [ ] Auditar: **cero usos de `Capacitor.isNativePlatform()`**
- [ ] Verificar Mapbox GL en web (debería funcionar sin cambios)

---

## FASE 15 — Optimización SOLID y Calidad
> Estado: 🔴 Pendiente

- [ ] Auditar SRP: cada feature module tiene responsabilidad única
- [ ] Auditar DIP: servicios dependen de interfaces/tipos, no de implementaciones
- [ ] Verificar que page components son "thin" (solo composición)
- [ ] JSDoc en **todos** los servicios: `@param`, `@returns`, `@throws`, `@example`
- [ ] JSDoc en todos los hooks custom
- [ ] Auditar duplicación cross-features → extraer a `shared/`
- [ ] React Query: keys consistentes, invalidaciones correctas, stale times apropiados
- [ ] Error handling centralizado en `shared/utils/errorHandler.ts`
- [ ] Implementar error boundaries en rutas principales
- [ ] Revisar bundle size y aplicar code splitting donde sea necesario

---

## FASE 16 — Testing
> Estado: 🔴 Pendiente

- [ ] Unit tests: servicios críticos (authService, invoicesService, estimatesService)
- [ ] Unit tests: hooks con mock de Supabase
- [ ] Integration tests: flujos críticos (login, crear invoice, pagar invoice)
- [ ] Test responsive: breakpoints mobile/tablet/desktop
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Test de accesibilidad básico (axe-core o similar)

---

## FASE 17 — CI/CD y Deployment Final
> Estado: 🟡 Bloqueada — confirmar tipo de hosting AWS

- [ ] **[DECISIÓN]** Confirmar tipo de hosting AWS (S3+CloudFront / ECS / EC2 / Amplify)
- [ ] **[DECISIÓN]** Confirmar dominio de la versión web
- [ ] Finalizar `.github/workflows/ci.yml` (lint + type-check + test)
- [ ] Finalizar `.github/workflows/deploy-staging.yml`
- [ ] Finalizar `.github/workflows/deploy-production.yml`
- [ ] Configurar branch protection: `main` y `develop` requieren PR + CI verde
- [ ] Configurar GitHub Secrets (staging y prod separados)
- [ ] Configurar DNS y certificado SSL
- [ ] Smoke test post-deploy staging: login → dashboard → crear invoice → logout
- [ ] Deploy a producción + plan de rollback definido

---

## Log de Sesiones

| Fecha | Fases avanzadas | Notas |
|-------|----------------|-------|
| 2026-02-24 | Plan creado | Fase 0 lista para iniciar |

---

> **¿Cómo continuar en una nueva sesión?**
> Abre Claude Code desde `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`, escribe "continúa con el plan" y leeré este archivo para retomar desde donde quedamos.
