# Thunder Dashboard — Plan Maestro de Migración Web

> **Estado actual:** 🟢 En progreso
> **Fase activa:** Siguiente fase pendiente (ver tabla de fases)
> **Última actualización:** 2026-03-04
> **Sesión anterior:** F19 Time Clock ✅ completo (types, service, hooks, PDF generator, 7 components, page, queryKeys, route). Smart Map ✅ redesign completo: multi-select filters, KPI cards, toolbar con filter tabs coloreados, InfoWindow HTML mejorado con badge tipo + email/phone links. Build: 0 errores.

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
│   │   ├── layout/                # MainLayout, DesktopSidebar, DesktopHeader (responsive web)
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
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F14 → F15 → F19 → F20 → F13 → F16 → F17 → F18
```

> F13 (suscripciones) requiere decisiones de negocio → se puede avanzar en paralelo con últimas fases de features.
> F16 (i18n) se puede iniciar una vez todos los features estén estables — los strings deben coincidir con swift-slate.

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
- [x] Adaptar layout de thunder-web-version: `MainLayout`, `DesktopSidebar`, `DesktopHeader`
- [x] Responsive web: sidebar colapsable en desktop (≥1024px), Sheet drawer en mobile (<1024px) — SIN BottomNav ni FloatingActionButtons (eran diseño de app nativa, eliminados)
- [x] Implementar `shared/components/common/FeaturePaywall.tsx`
- [x] Crear `shared/hooks/useAuth.ts`
- [x] Crear `shared/hooks/useProfile.ts`
- [x] Crear `shared/hooks/useIsMobile.ts`
- [x] Implementar `SubscriptionContext` (sin RevenueCat, Supabase como fuente de verdad)
- [x] `ScrollToTop`
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
> Estado: ✅ Completa

- [x] `shared/utils/formatters.ts` — `formatCurrency`, `getRelativeTime`, `getUserTimezone`, `getCurrentDateInTimezone`
- [x] `features/dashboard/types/dashboard.types.ts` — ActivityType, Activity, TodayRoute, chart point interfaces
- [x] `features/dashboard/services/dashboardService.ts` — `fetchInvoices`, `fetchEstimates`, `fetchClientsCount`, `fetchEmployeesCount`, `fetchLeadsCount`, `fetchBookingsCount`, `fetchActivities`, `fetchTodayRoutes` (JSDoc completo)
- [x] `features/dashboard/hooks/useDashboardStats.ts` — React Query + derivados (sparkline, weeklySales, pendingByMonth, aggregates) + realtime invoices
- [x] `features/dashboard/components/StatsCard` — colored KPI card
- [x] `features/dashboard/components/RevenueChart` — AreaChart sparkline 3 meses
- [x] `features/dashboard/components/WeeklySalesChart` — BarChart semanas del mes actual
- [x] `features/dashboard/components/PendingInvoicesChart` — BarChart últimos 6 meses
- [x] `features/dashboard/components/ActivityFeed` — feed de actividad de hoy con iconos/colores por tipo
- [x] `features/dashboard/components/TodayRoutes` — rutas del día con conteo de servicios
- [x] `features/dashboard/pages/DashboardPage` — diseño de thunder-web-version, thin page
- [x] Responsive: 4-col grid desktop, 2-col grid mobile
- [x] Ruta `/home` habilitada (ProtectedRoute), `/` redirige a `/auth`

---

## FASE 5 — CRM (Clientes, Leads, Tareas, Notificaciones)
> Estado: ✅ Completa

### Clientes
- [x] `features/crm/types/crm.types.ts` — Client, Lead types
- [x] `features/crm/clients/services/clientsService.ts` (JSDoc)
- [x] `features/crm/clients/hooks/useClients.ts` — useClients, useClient, useCreateClient, useUpdateClient, useDeleteClient
- [x] `features/crm/clients/schemas/clientSchema.ts`
- [x] `features/crm/clients/components/ClientsTable` — DataTable con búsqueda, paginación y dropdown de acciones completo
- [x] `features/crm/clients/components/ClientForm` (add/edit unificado, Dialog modal) — con AddressAutocomplete en billing street
- [x] `features/crm/clients/components/ClientDetailModal` — modal con info completa + acciones de swift-slate (condicionales por status) + live refresh via useClient
- [x] ~~`features/crm/clients/pages/ClientDetailPage`~~ — eliminada, reemplazada por modal

### Leads
- [x] `features/crm/leads/services/leadsService.ts` — CRUD + convertLeadToClient (JSDoc)
- [x] `features/crm/leads/hooks/useLeads.ts` — useLeads, useLead, useCreateLead, useUpdateLead, useDeleteLead
- [x] `features/crm/leads/schemas/leadSchema.ts`
- [x] `features/crm/leads/components/LeadsKanban` — 5 columnas, drag-and-drop (@dnd-kit), cards con color por prioridad
- [x] `features/crm/leads/components/LeadForm` (add/edit unificado, Dialog modal) — con AddressAutocomplete en street address
- [x] `features/crm/leads/components/LeadDetailModal` — modal con info completa + quick actions + live refresh via useLead
- [x] ~~`features/crm/leads/pages/LeadDetailPage`~~ — eliminada, reemplazada por modal

### Tareas
- [x] `features/tasks/types/task.types.ts` — Task, TaskWithClient types (incluye phone/email del cliente)
- [x] `features/tasks/services/tasksService.ts` (JSDoc)
- [x] `features/tasks/hooks/useTasks.ts` — useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask
- [x] `features/tasks/schemas/taskSchema.ts`
- [x] `features/tasks/utils/taskFormatters.ts` — formatDueDate, getAssignedName, getAssignedNames
- [x] `features/tasks/components/TasksTable` — DataTable con dropdown de acciones condicionales por status
- [x] `features/tasks/components/TaskForm`
- [x] `features/tasks/components/TaskDetailModal` — modal con info + empleados + cliente + quick actions (Start/Complete/Edit/Delete por status)
- [x] ~~`features/tasks/pages/TaskDetailPage`~~ — eliminada, reemplazada por modal

### Notificaciones
- [x] `features/notifications/services/notificationsService.ts` (JSDoc)
- [x] Real-time subscription via Supabase channel
- [x] `features/notifications/hooks/useNotifications.ts`
- [x] `features/notifications/pages/NotificationsPage`

### CRM Page
- [x] `features/crm/pages/CRMPage` — tabs Clients/Leads/Tasks con URL sync via searchParams, stats bar con 4 KPIs
- [x] `features/crm/hooks/useCRMStats.ts` — stats centralizadas (React Query deduplica)
- [x] Rutas habilitadas: `/crm`, `/notifications` (rutas de detalle eliminadas — todo vía modales)

### Shared (mejoras post-F5)
- [x] `shared/components/common/DetailModal` — wrapper reutilizable (header oscuro + body scrollable) para todos los modales de detalle
- [x] `shared/components/common/Avatar` — InitialsAvatar, getInitials, getAvatarColor
- [x] `shared/constants/styleTokens.ts` — tokens centralizados de colores para priority/status (PRIORITY_BADGE, PRIORITY_SOFT, PRIORITY_SOFT_BORDER, LEAD_CARD_BG, LEAD_STATUS_BADGE, TASK_STATUS_SOFT, TASK_STATUS_BADGE, TASK_STATUS_HEADER_BADGE, CLIENT_STATUS_BADGE, CLIENT_STATUS_TABLE)
- [x] `tailwind.config.ts` — grupos de color tokens con `<alpha-value>`: `priority`, `task-status`, `lead-status`, `client-status` — sin colores hardcodeados en componentes
- [x] Padding uniforme `p-2.5 space-y-2.5` en todas las páginas internas
- [x] `shared/components/common/EntityPickerField` — picker genérico reutilizable (multi/single, búsqueda, "Create new" inline, pills removibles). Usado en TaskForm; listo para EstimateForm, etc.
- [x] `shared/components/AddressAutocomplete.tsx` — Google Places autocomplete (US), rellena street/city/state/zip. Usa `VITE_GOOGLE_MAPS_API_KEY`.
- [x] `shared/components/DeliveryMethodSelector.tsx` — selector de método de entrega reutilizable (usado en estimates y invoices)
- [x] `shared/hooks/useGoogleMaps.ts` — carga el script de Google Maps una sola vez por sesión
- [x] `features/employees/schemas/employeeSchema.ts` + `services/employeesService.ts` + `hooks/useEmployees.ts` (fetchEmployees, createEmployee, useCreateEmployee) — infraestructura base F10
- [x] `features/employees/components/EmployeeForm` — modal de creación inline (parity swift-slate /add-employee): nombre, email, teléfono, género, fecha de nacimiento, posición, tarifa, dirección, notas
- [x] `features/tasks/components/TaskForm` — actualizado: `EntityPickerField` multi para empleados + single para cliente; `EmployeeForm` como modal anidado (nested dialog sin cerrar TaskForm); `Controller` RHF para selects controlados
- [x] Logos y favicon: `src/assets/` (thunder-logo.png, thunder-logo-white.png, thunder-pro-logo.png), `public/favicon.ico`, `index.html` actualizado
- [x] `DesktopSidebar` — reemplazado texto "Thunder Pro" por imágenes: expandido → logo-pro, colapsado → logo icono

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
> Estado: ✅ Completa (incluyendo refinamiento SOLID + draft system)

### Infraestructura base
- [x] `features/estimates/types/estimate.types.ts` — EstimateRow, EstimateInsert, EstimateUpdate, EstimateStatus, FormattedEstimate, DraftData
- [x] `features/estimates/services/estimatesService.ts` — CRUD, share token, fetchByToken, profile, activities, notifications, saveDraftEstimate, loadDraftEstimate, deleteDraftEstimate
- [x] `features/estimates/services/generateCommercialProposalPDF.ts` — jsPDF multi-page proposal (cover + specs + 14 contract terms + signatures)
- [x] `features/estimates/config/steps.config.ts` — RESIDENTIAL_STEPS (11), COMMERCIAL_STEPS (8)
- [x] `features/estimates/hooks/useEstimates.ts` — useEstimates, useEstimate, useCreateEstimate, useUpdateEstimate, useUpdateEstimateStatus, useDeleteEstimate
- [x] `features/estimates/hooks/useEstimateShare.ts` — generates share link, copies to clipboard
- [x] `features/estimates/hooks/useSendEstimateEmail.ts` — calls send-estimate-email Edge Function
- [x] `features/estimates/hooks/useDraftEstimate.ts` — auto-save debounced, load/save/delete draft, clearLoadedDraft
- [x] `features/estimates/hooks/useResidentialPricing.ts` — all residential pricing calculations
- [x] `features/estimates/hooks/useCommercialPricing.ts` — Group A (sqft) + Group B (restaurant/food-truck) pricing, isGroupB helper
- [x] `shared/services/pdf.service.ts` — generateEstimatePDF + EstimatePDFData
- [x] `shared/utils/estimatePricing.ts` — pricing constants + calculateAdjustedPrice

### Shared step components
- [x] `features/estimates/components/EstimateClientStep.tsx` — client/lead picker (shared)
- [x] `features/estimates/components/EstimateFormLayout.tsx` — sticky header/tabs/footer shell (shared)
- [x] `features/estimates/components/DraftStatusIndicator.tsx` — "Saving…" / "Draft saved" badge
- [x] `features/estimates/components/DraftRecoveryDialog.tsx` — "Continue" vs "Start Fresh" on mount
- [x] `features/estimates/components/ExitConfirmationDialog.tsx` — "Save draft / Discard / Cancel" on back

### Residential step components (11 pasos)
- [x] `ResServiceStep`, `ResRoomsStep`, `ResAdditionalStep`, `ResExtrasStep`, `ResPetsStep`, `ResLaundryStep`, `ResScopeStep`, `ResSummaryStep`, `ResPreviewStep`, `ResSendStep`

### Commercial step components (8 pasos)
- [x] `CommPropertyStep` — property type + size + service type + recurring frequency + select days + contract duration
- [x] `CommDetailsStep` — Group B: service schedule + grease level + restaurant condition + client provides supplies + extra services
- [x] `CommMainStep` — total employees + hourly rate + cleaning duration + time (start + end auto-calculated)
- [x] `CommScopeStep`, `CommSummaryStep`, `CommPreviewStep` (full ProposalPreview + Download PDF), `CommSendStep` (email/sms/both)

### Pages
- [x] `features/estimates/pages/EstimatesPage.tsx` — KPI cards, toolbar, table, draft actions (Continue/Start Fresh/Delete)
- [x] `features/estimates/pages/CreateResidentialEstimatePage.tsx` — 11-step orchestrator + draft flow
- [x] `features/estimates/pages/CreateCommercialEstimatePage.tsx` — 8-step orchestrator + draft flow (Group A + B)
- [x] `features/estimates/pages/PublicEstimateViewPage.tsx` — token → PDF blob redirect
- [x] `features/estimates/components/EstimateDetailsModal.tsx` — full details + draft-specific rendering (real client data, step progress, form data from draft_data JSON)

### Routes
- [x] `/estimates`, `/estimates/new/residential`, `/estimates/new/commercial`, `/public/estimate/:token`

---

## FASE 8 — Invoices
> Estado: ✅ Completa

- [x] `features/invoices/types/invoice.types.ts` — Invoice, LineItem, InvoiceStatus, InvoiceFormData, InvoiceStats
- [x] `features/invoices/services/invoicesService.ts` — fetchInvoices, fetchInvoiceById, generateInvoiceNumber, createInvoice, updateInvoice, markInvoiceAsPaid, cancelInvoice, markReminderSent, markInvoiceViewed, deleteInvoice (JSDoc completo)
- [x] `features/invoices/services/generateInvoicePDF.ts` — jsPDF invoice generator (blue scheme, logo, status badge, line items table, totals, footer)
- [x] `features/invoices/hooks/useInvoices.ts` — useInvoices, useInvoice, useCreateInvoice, useUpdateInvoice, useMarkInvoiceAsPaid, useCancelInvoice, useMarkReminderSent, useDeleteInvoice
- [x] `features/invoices/hooks/useSendInvoiceEmail.ts` — llama edge function `send-invoice-email`
- [x] `features/invoices/schemas/invoiceSchema.ts` — Zod validation
- [x] `features/invoices/components/InvoiceDetailsModal.tsx` — modal completo (2 cols: client/details/notes/quickActions | total/lineItems), Payment Dialog, Cancel Dialog, Email Success Dialog
- [x] `features/invoices/pages/InvoicesPage.tsx` — tabla con 4 KPI cards (Pending/Paid/Draft/Cancelled), filtros (status/search/date), paginación 10/página, dropdown actions por fila
- [x] `features/invoices/pages/CreateInvoicePage.tsx` — form multi-sección: Invoice Details, Title, Customer (searchable), Line Items, Pricing & Tax, Notes. Auto-genera INV-YYYY-NNN. Modo edición. Save Draft / Next.
- [x] `features/invoices/pages/InvoicePreviewPage.tsx` — preview visual + delivery method (Email/SMS/Both igual que estimates) + botón Send
- [x] `features/invoices/pages/PublicInvoicePaymentPage.tsx` — página pública sin auth, Stripe Checkout (`stripe-create-checkout` edge function), estados: loading/not found/already paid/pending
- [x] Rutas: `/invoices`, `/invoices/new`, `/invoices/:id/edit`, `/invoices/:id/preview`, `/invoice/payment/:id` (public)
- [x] Invoice form: footer Cancel/Save/Next en edición (3 cols) y Cancel/Next en creación (2 cols), igual a swift-slate
- [x] `InvoiceDetailsModal`: quick actions estrictamente por status (Draft/Pending/Paid/Cancelled), visibles en mobile y desktop
- [x] `shared/components/DeliveryMethodSelector.tsx` — componente reutilizable usado en estimates y invoices
- [x] Build: 0 errores TypeScript

---

## FASE 9 — Scheduling (Rutas, Citas, SmartMap)
> Estado: ✅ Completa (Google Maps en AppointmentDetailModal pendiente — mapa no renderiza, se resuelve en sesión posterior)

- [x] `features/scheduling/types/scheduling.types.ts`
- [x] `features/scheduling/services/routesService.ts`, `appointmentsService.ts`
- [x] `features/scheduling/hooks/useRoutes.ts`, `useAppointments.ts`, `useSmartMap.ts`
- [x] `features/scheduling/hooks/useSendAppointmentEmail.ts` → edge fn `send-appointment-emails`
- [x] `features/scheduling/hooks/useSendAppointmentSMS.ts` → edge fn `send-appointment-sms`
- [x] `features/scheduling/config/appointmentSteps.config.ts` — 10 pasos
- [x] `features/scheduling/components/AppointmentFormLayout.tsx`
- [x] Steps (10): Route, Client, Service, Schedule, Staff (con Total Labor Cost), Deposit, Contract, Instructions (textarea + Upload Photos), Preview, Send
- [x] `features/scheduling/components/AppointmentCard.tsx`
- [x] `features/scheduling/components/SchedulingCalendar.tsx`
- [x] `features/scheduling/components/RouteMapView.tsx` — Google Maps multi-stop
- [x] `features/scheduling/components/AppointmentDetailModal.tsx` — two-column cards, employees fetched inline, Quick Actions: Edit + Delete únicamente
- [x] `features/scheduling/components/SmartMapView.tsx` — InfoWindow HTML mejorado (badge tipo coloreado, email/phone links)
- [x] Páginas: `RoutesPage` (Calendar/Map toggle), `AddAppointmentPage` (create + edit), `SmartMapPage`
- [x] Router: `/create-route`, `/create-route/new`, `/create-route/:id/edit`, `/smart-map`
- [x] EmployeeForm actualizado: 5 secciones (Personal, Employment, Available Days grid, Notes, Upload Documents)
- [x] SmartMapPage rediseñado (2026-03-04): KPI cards (4), toolbar con filter tabs multi-select coloreados, `useSmartMap` upgraded a `selectedFilters: string[]` + `toggleFilter()`
- [ ] ⚠️ **Pendiente debug:** Google Maps en `AppointmentDetailModal` — mapa Company→Client no renderiza (ver F20)

---

## FASE 10 — Employees + Employee Portal
> Estado: ✅ Completada (10A Gestión Interna). 10B Employee Portal: pendiente (alta complejidad)

### Gestión Interna (10A) ✅
- [x] `features/employees/services/employeesService.ts` — Employee type completo, fetchAllEmployees, fetchEmployeeById, updateEmployee, updateEmployeeStatus, checkDeleteGuard, deleteEmployee
- [x] `features/employees/services/generateEmployeeSheetPDF.ts` — portado de swift-slate (jsPDF, blue [79,129,189], secciones: Personal/Address/Employment/Availability/Signatures)
- [x] `features/employees/hooks/useEmployees.ts` — useAllEmployees, useEmployee, useCreateEmployee, useUpdateEmployee, useUpdateEmployeeStatus, useDeleteEmployee (con guard)
- [x] `features/employees/schemas/employeeSchema.ts` — Zod schema completo
- [x] `features/employees/components/EmployeeForm` — edit mode (employeeId prop, prefill, useUpdateEmployee), existing docs list
- [x] `features/employees/components/EmployeeDetailsModal` — two-column Cards, Quick Actions (Edit/Activate/Suspend/Download PDF/Delete), ConfirmDialog
- [x] `features/employees/pages/EmployeesPage` — KPI cards ×4 (patrón unificado single Card), Toolbar Card (Tabs + Search + Add), Table (Employee/Position/Email/Phone/Status/Actions con DropdownMenu), → EmployeeDetailsModal + Edit inline
- [x] Router: `/employees` → `EmployeesPage`
- [x] Fix: `available_days` keys normalizadas a lowercase en EmployeeForm (edit prefill) y generateEmployeeSheetPDF
- [x] CRM KPI cards unificadas al mismo patrón (single Card + border-l-4)

### Employee Portal (10B) — Pendiente
- [ ] `features/employee-portal/services/employeePortalService.ts`
- [ ] Layout propio para el portal (sin MainLayout principal)
- [ ] Páginas: `EmployeeLoginPage`, `EmployeeDashboardPage`, `EmployeeShiftDetailPage`, `EmployeeHistoryDetailPage`

---

## FASE 11 — Walkthroughs
> Estado: ✅ Completa

- [x] `features/walkthroughs/services/walkthroughsService.ts` — CRUD puro (sin side-effects), `fetchContactInfo` vía utils, `resolveContact` batch helper
- [x] `features/walkthroughs/hooks/useWalkthroughs.ts` — useWalkthroughs, useWalkthrough, useCreateWalkthrough, useUpdateWalkthrough, useUpdateWalkthroughStatus, useDeleteWalkthrough. Edge fn notifications en `onSuccess`
- [x] `features/walkthroughs/schemas/walkthroughSchema.ts` — Zod validation
- [x] `features/walkthroughs/config/walkthroughConfig.ts` — todas las constantes (property types, service types, options, etc.)
- [x] `features/walkthroughs/utils/walkthroughUtils.ts` — formatTime, formatDate, statusBadgeClass, formatStatusLabel, formatDuration, fetchContactInfo
- [x] `features/walkthroughs/components/WalkthroughForm.tsx` — modal dialog create + edit
- [x] `features/walkthroughs/components/WalkthroughDetailsModal.tsx` — two-column Cards, Quick Actions por status (Edit / Mark Completed / Convert to Estimate / Cancel / Delete)
- [x] `features/walkthroughs/components/WalkthroughClientPicker.tsx` — usa useClients()/useLeads() (shared cache)
- [x] `features/walkthroughs/components/PickerDialog.tsx` — dialog reutilizable de selección de opción
- [x] `features/walkthroughs/components/FloatInput.tsx` — input numérico con floating label (type=text+inputMode, toIntegerString/toDecimalString)
- [x] `features/walkthroughs/pages/WalkthroughsPage.tsx` — KPI (Pending/Completed), toolbar, tabla, QR dialog para "Start Walkthrough"
- [x] `features/walkthroughs/pages/ResidentialWalkthroughFormPage.tsx` — formulario público on-site, secciones: Property/Service/Sqft/Rooms/Extras/Services/Pets/Notes
- [x] `features/walkthroughs/pages/CommercialWalkthroughFormPage.tsx` — formulario público on-site, secciones: Property/Service/Schedule/Grease/Condition/Extras/Supplies/Recurring/Notes
- [x] Router: `/walkthroughs` (protected), `/walkthrough/residential/:id` y `/walkthrough/commercial/:id` (public)
- [x] "Convert to Estimate" → navega a `/estimates/new/residential|commercial` con `state.prefill`
- [x] Estimate pages leen `location.state.prefill` → pre-populate client/lead en Step 0
- [x] `DraftRecoveryDialog` eliminado de estimate pages (modal "Continue where you left off?" removido)
- [x] Build: 0 errores TypeScript

---

## FASE 12 — Settings (Perfil, Empresa, Seguridad)
> Estado: ✅ Completo

- [x] `features/settings/schemas/settingsSchemas.ts` (editProfile, editCompany, security — Zod)
- [x] `features/settings/services/settingsService.ts` (updatePersonalInfo, updateCompanyInfo, updatePassword, uploadLogo, fetchPublicProfile)
- [x] `features/settings/hooks/useSettings.ts` (5 hooks: useUpdatePersonalInfo, useUpdateCompanyInfo, useUpdatePassword, useUploadLogo, usePublicProfile)
- [x] `ProfilePage` — split-panel: izquierda (avatar + info rows + nav), derecha (form activo). Secciones embebidas como sub-componentes. Save/Cancel cuando isDirty.
- [x] `EditProfilePage`, `EditCompanyInfoPage`, `SecurityPage` — standalone para acceso directo/mobile
- [x] `ContactCardPage` — pública `/contact-card/:userId`, descarga vCard `.vcf`
- [x] `ContractPage` — coming soon placeholder
- [x] `PrivacyPage` — estática, 12 secciones, `privacy@thunderpro.co`
- [x] Router: 7 rutas nuevas (Phase 12 ✅)
- [x] Build: 0 errores TypeScript

---

## FASE 20 — Mapas y Geolocalización
> Estado: 🔴 Pendiente
> Descubierto: múltiples usos de mapas en swift-slate no cubiertos aún en thunder_dashboard

### Inventario completo de mapas en swift-slate

| Componente/Página | Dónde se usa | Qué hace | Estado en dashboard |
|-------------------|-------------|----------|-------------------|
| `MapView.tsx` | `CreateRoute.tsx`, `Home.tsx` | Multi-stop route (DirectionsService) | ✅ Portado como `RouteMapView.tsx` (F9) |
| `SmartMap.tsx` (Google Maps + geocoding) | `/smart-map` | Pines leads/clients/employees con geocoding | ✅ `SmartMapView.tsx` usa QK markers (F9) — ver nota geocoding |
| `AddressAutocomplete.tsx` | Todos los forms | Google Places autocomplete | ✅ Portado (F5) |
| `RouteInformation.tsx` | Clic en cita del calendario | Página de detalle: ruta empresa→cliente con distancia/tiempo | ⚠️ Portado como `AppointmentDetailModal` — mapa no renderiza |
| `EmployeeLocationMap.tsx` | Time Clock manager view | Mapa clock-in/clock-out con polyline | 🔴 Parte de F19 |
| `RealTimeLocationMap.tsx` | `EmployeeDashboard.tsx` | GPS real-time + geofence circle (para empleado) | 🔴 Parte de F10B |
| `LocationMap.tsx` | `EmployeeDashboard.tsx` | iframe Google Maps embed + distancia geofence | 🔴 Parte de F10B |
| `LeadDetails.tsx` (mapa) | Detalle de lead | Mapa con dirección del lead | 🟡 Nuestros modales no lo tienen (opcional) |
| `WalkthroughDetails.tsx` (mapa) | Detalle de walkthrough | Mapa con dirección del contacto | 🟡 Nuestros modales no lo tienen (opcional) |
| `BookingDetails.tsx` (mapa) | Detalle de booking | Mapa empresa→cliente | 🔴 Parte de F6 |

---

### 1 · Fix AppointmentDetailModal — Mapa Company→Client
**Bug pendiente de F9.** El mapa está implementado pero no renderiza.

- [ ] Debuggear por qué el mapa Google Maps no renderiza en `AppointmentDetailModal` — posibles causas: div sin dimensiones, `useGoogleMaps` carga asíncrona vs `useEffect` timing, API key sin billing activo para Maps JS API
- [ ] Verificar que `VITE_GOOGLE_MAPS_API_KEY` tiene habilitadas las APIs: Maps JavaScript API + Directions API + Geocoding API
- [ ] Confirmar que el `div` del mapa tiene `height` explícito (Google Maps necesita dimensión física, no solo `h-full`)
- [ ] Una vez fix aplicado: mostrar ruta Company address → Client address con distancia y tiempo estimado

### 2 · SmartMap — Geocoding de direcciones
**Nota arquitectural importante.** En swift-slate, `SmartMap.tsx` usa `google.maps.Geocoder` para convertir direcciones texto → lat/lng en tiempo real (clientes/leads/empleados no tienen lat/lng almacenado en DB).

En thunder_dashboard, `SmartMapPage` usa `QK.smartMapLeads/Clients/Employees` y pasa `MapMarker[]` con `{ lat, lng }` al `SmartMapView`. Si la DB no almacena coordenadas, los marcadores no aparecen.

- [ ] Verificar si la tabla `clients` / `leads` / `employees` tiene columnas `lat`/`lng` o similar en Supabase
- [ ] Si NO tienen coordenadas almacenadas: implementar geocoding on-demand en `SmartMapPage` (misma lógica que swift-slate — `google.maps.Geocoder`, geocodificar `street + city + state + zip`)
- [ ] Si SÍ tienen coordenadas: confirmar que el flujo actual funciona correctamente
- [ ] Agregar manejo de estado "Geocoding…" mientras se procesan las direcciones (igual que swift-slate muestra `isGeocoding` state)

### 3 · EmployeeLocationMap (Time Clock)
> Este ítem ya está en F19 — se lista aquí para referencia cruzada

- [ ] `features/time-clock/components/EmployeeLocationMap.tsx` — mapa Google Maps con marcadores clock-in (verde "IN") / clock-out (rojo "OUT") + Polyline azul entre ellos. Usar `useGoogleMaps`. Mostrar "No location data available" si no hay coordenadas.
- [ ] Mostrarlo en `EmployeeDetailView` cuando el turno tiene lat/lng guardados

### 4 · RealTimeLocationMap + LocationMap (Employee Portal)
> Estos ítems son parte de F10B — se listan aquí para referencia cruzada

Componentes para el portal del empleado (clock-in desde su dispositivo):
- [ ] `features/employee-portal/components/RealTimeLocationMap.tsx` — mapa Google Maps con: marcador azul "usuario actual" (navigator.geolocation.watchPosition), marcador verde "shift location", geofence circle (radio 100m, verde si dentro, rojo si fuera)
- [ ] `features/employee-portal/components/LocationMap.tsx` — versión iframe (Google Maps Embed API) con badge de distancia y panel "You are at the job site" / "Must be within 100m"
- [ ] `shared/services/geolocation.service.ts` — ya existe. Añadir `calculateDistance(lat1, lng1, lat2, lng2)` (Haversine formula) y `formatDistance(meters)` si no existen
- [ ] Geofence enforcement: el botón "Clock In" del portal solo se activa cuando `distance <= 100m`

### 5 · Mapas en modales de detalle (opcional — baja prioridad)
swift-slate tiene mapas en LeadDetails y WalkthroughDetails. Nuestros modales los omiten. Estos son enhancements opcionales.

- [ ] (Opcional) `LeadDetailModal` — pequeño mapa estático con dirección del lead (Google Maps Static API o iframe embed)
- [ ] (Opcional) `WalkthroughDetailsModal` — pequeño mapa estático con dirección del contacto
- [ ] (Opcional) `ClientDetailModal` — ídem para clientes
> **Nota:** En móvil, estos mapas reemplazaban la navegación. En web, los modales tienen más espacio. Implementar solo si el cliente lo solicita.

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
> Estado: ✅ Completo (servicios ya existían de fases anteriores)

- [x] `shared/services/storage.service.ts` — localStorage abstraction, JSDoc ✅
- [x] `shared/services/geolocation.service.ts` — promisify `navigator.geolocation`, JSDoc ✅
- [x] `shared/services/pdf.service.ts` — jsPDF + FileService download, JSDoc ✅
- [x] `shared/services/share.service.ts` — Web Share API + clipboard fallback, JSDoc ✅
- [x] `shared/services/file.service.ts` — downloadBlob / downloadDataUrl, JSDoc ✅
- [x] Auditar: **cero imports de `@capacitor/*`** — confirmado, ninguno encontrado
- [x] Auditar: **cero usos de `Capacitor.isNativePlatform()`** — confirmado, ninguno encontrado
- [x] SmartMapView usa Google Maps (useGoogleMaps hook) — la nota de "Mapbox" en versiones anteriores del plan era incorrecta

---

## FASE 15 — Optimización SOLID y Calidad
> Estado: ✅ Completa

- [x] `src/shared/config/queryKeys.ts` — objeto `QK` centralizado (fuente única de verdad para 60+ query keys). Claves estáticas + funciones dinámicas con `as const`
- [x] Actualizar 15+ archivos de hooks y 12+ páginas/componentes para usar `QK.*` en lugar de strings inline
- [x] `src/shared/components/common/ErrorBoundary.tsx` — class component estándar, fallback Card "Something went wrong" + botón Reload
- [x] `src/app/routes/index.tsx` — `<ErrorBoundary>` envuelve `<Suspense>` globalmente
- [x] `WalkthroughsPage.tsx` — eliminado `supabase.auth.getUser()` inline → `useAuth()`. Edge fn calls movidos a `useSendWalkthroughStart()` mutation
- [x] `CreateCommercialEstimatePage.tsx` — eliminado `supabase.from("profiles")` inline → `useProfile()`. Client/lead prefill usa `fetchClient(id)` y `fetchLead(id)` desde CRM services
- [x] `CreateInvoicePage.tsx` — `queryKey` actualizado a `QK.clientsForInvoice`
- [x] JSDoc completo en `employeesService.ts` (8 funciones exportadas: `@param`, `@returns`, `@throws`)
- [x] Fix build: `emp.gender ?? ""` en EmployeesPage. Eliminar `isPending: isUpdating` no usado en WalkthroughDetailsModal
- [x] Build: `npm run build` → 0 errores TypeScript (`tsc -b`)

---

## FASE 19 — Time Clock (Employee Time Tracking)
> Estado: ✅ Completa (2026-03-04)
> Descubierto: existe en swift-slate como `/time-clock` pero no estaba en el plan original

### Descripción
Sistema completo de seguimiento de tiempo de empleados. Los managers ven quién está trabajando, editan tiempos con auditoría, generan timesheets en PDF y marcan períodos como pagados.

### Tablas Supabase utilizadas
- `time_entries` — `{ id, user_id, employee_id, date, clock_in_time, break_start_time, break_end_time, clock_out_time, total_hours, total_break_minutes, status, route_appointment_id, notes, clock_in/out_latitude/longitude, manually_edited, edited_by, edited_at, created_at, updated_at }`
- `paid_periods` — `{ id, user_id, employee_id, start_date, end_date, created_at, updated_at }`

### Query Keys a añadir en `QK`
```ts
timeEntriesToday:     (date: string) => ["time-entries-today", date]        as const,
timeEntriesScheduled: (date: string) => ["time-entries-scheduled", date]    as const,
timeEntriesAll:       (from: string, to: string) => ["time-entries-all", from, to] as const,
timeEntriesEmployee:  (id: string, from: string, to: string) => ["filtered-time-entries", id, from, to] as const,
paidPeriods:          (empId: string) => ["paid-periods", empId]            as const,
```

### Infraestructura
- [ ] `features/time-clock/types/timeClock.types.ts` — `TimeEntry`, `PaidPeriod`, `TimesheetEntry`, `EmployeeTimesheetData`
- [ ] `features/time-clock/services/timeClockService.ts` — `fetchTodayEntries`, `fetchScheduledEntries`, `fetchAllEntries(from, to)`, `fetchEmployeeEntries(empId, from, to)`, `updateTimeEntry` (edit con audit trail: `manually_edited`, `edited_by`, `edited_at`), `markAsPaid`, `fetchPaidPeriods` (JSDoc completo)
- [ ] `features/time-clock/services/generateTimesheetPDF.ts` — `generateEmployeeTimesheetPDF()` (jsPDF portrait: header, métricas, tabla por fecha, totales) + `generateGeneralTimesheetPDF()` (resumen todos los empleados)
- [ ] `features/time-clock/hooks/useTimeClock.ts` — `useTimeEntriesToday`, `useTimeEntriesScheduled`, `useTimeEntriesAll`, `useEmployeeTimeEntries`, `useUpdateTimeEntry`, `useMarkAsPaid`, `usePaidPeriods`, `useSendTimesheet`
- [ ] `features/time-clock/hooks/useShiftTimeEdit.ts` — state machine para edición de campos (startEdit, cancelEdit, requestSave, confirmSave, setEditDraftValues). Detecta cambios para mostrar en modal de confirmación

### Componentes
- [ ] `features/time-clock/components/TimeClockKPICards.tsx` — 4 KPIs: Active Now (azul), Total Hours (naranja), Pay Now (verde), Overtime (morado). Mismo patrón `border-l-4` del resto del proyecto
- [ ] `features/time-clock/components/TodayTab.tsx` — lista de empleados trabajando hoy, grouped by employee. Cada card: avatar, nombre, status badge (Active/Completed), shifts con 2×2 grid (Clock In/Break Start/Break End/Clock Out), total hours/pay
- [ ] `features/time-clock/components/ScheduledTab.tsx` — entradas futuras (status='scheduled'), agrupadas por empleado + fecha, con link a cita si tiene `route_appointment_id`
- [ ] `features/time-clock/components/TimesheetsTab.tsx` — rango de fechas (date range picker), lista de empleados con horas y pago agregados. Clickable → selecciona empleado y muestra detalle
- [ ] `features/time-clock/components/EmployeeDetailView.tsx` — vista de detalle para un empleado: fechas agrupadas, múltiples shifts por fecha, inputs de tiempo en modo edición, badge "Paid" en fechas pagadas, botón + menu de acciones
- [ ] `features/time-clock/components/ShiftCard.tsx` — card de turno individual con 2×2 grid de campos de tiempo (display/edit mode), status badge, botón edit pencil
- [ ] `features/time-clock/components/ShiftTimeEditConfirmModal.tsx` — Dialog de confirmación con lista de cambios (campo: valor_anterior → valor_nuevo), Cancel/Confirm
- [ ] `features/time-clock/components/DateRangePicker.tsx` — si no existe uno reutilizable, crear wrapper sobre Calendar de shadcn

### Páginas
- [ ] `features/time-clock/pages/TimeClockPage.tsx` — página principal con 3 tabs (Today/Scheduled/Timesheets), KPI cards, date picker, employee detail view inline (sin navegación a otra página). Real-time via Supabase channel `time_entries_changes`

### Router
- [ ] Ruta: `/time-clock` (ProtectedRoute)
- [ ] Agregar a `DesktopSidebar` con icono `Clock` de lucide-react

### Funcionalidades
- [ ] Edición de tiempos con audit trail (`manually_edited=true`, `edited_by=userId`, `edited_at=now()`)
- [ ] Prevent edición en turnos dentro de períodos pagados (read-only si fecha está en `paid_periods`)
- [ ] Mark as Paid → crea registro en `paid_periods`
- [ ] Real-time updates (INSERT/UPDATE/DELETE en `time_entries` → invalidate queries)
- [ ] PDF individual: `generateEmployeeTimesheetPDF()` — portrait, header con rango, tabla fecha/tiempos/horas, totales
- [ ] PDF general: `generateGeneralTimesheetPDF()` — resumen de todos los empleados del rango
- [ ] Send timesheet por SMS/Email (edge functions: mismas que usa swift-slate)
- [ ] Overtime calculation: >40 horas semanales
- [ ] Feature flag: `time_clock` (subscription access control vía `FeaturePaywall`)
- [ ] Build: 0 errores TypeScript

---

## FASE 16 — Internacionalización (i18n)
> Estado: 🔴 Pendiente

### Decisión arquitectural confirmada
Los archivos de traducción serán **compartidos entre `swift-slate` (mobile) y `thunder_dashboard` (web)**.
Esto significa:
- Todo el texto visible en thunder_dashboard **debe coincidir exactamente** con el texto de swift-slate
- Al implementar i18n se creará UN solo set de archivos `.json` de traducciones usado en ambos proyectos
- No inventar texto nuevo — siempre copiar de swift-slate como fuente de verdad

### Stack i18n (pendiente confirmar librería exacta, opciones: i18next + react-i18next / react-intl)

- [ ] **[DECISIÓN]** Confirmar librería i18n (i18next recomendado por compatibilidad con Capacitor y React)
- [ ] Extraer todos los strings de texto de todos los componentes a archivos de traducción `en.json` / `es.json`
- [ ] Verificar que los strings coincidan 100% con swift-slate (mismas keys, mismos valores en inglés)
- [ ] Configurar `LanguageSelector` (ya presente en DesktopHeader) para cambiar idioma en tiempo real
- [ ] Persistir preferencia de idioma en localStorage
- [ ] Compartir/sincronizar archivos de traducción entre swift-slate y thunder_dashboard (git submodule o npm package privado)

---

## FASE 17 — Testing
> Estado: 🔴 Pendiente

- [ ] Unit tests: servicios críticos (authService, invoicesService, estimatesService)
- [ ] Unit tests: hooks con mock de Supabase
- [ ] Integration tests: flujos críticos (login, crear invoice, pagar invoice)
- [ ] Test responsive: breakpoints mobile/tablet/desktop
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Test de accesibilidad básico (axe-core o similar)

---

## FASE 18 — CI/CD y Deployment Final
> Estado: 🟡 Bloqueada — confirmar tipo de hosting AWS (antes Fase 17)

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
| 2026-02-25 | F3 ✅, F4 ✅ | Layout responsive web (sin BottomNav). Fase 16 i18n agregada. Texto debe coincidir con swift-slate. |
| 2026-02-25 | F5 ✅ | CRM completo: Clients, Leads (kanban), Tasks, Notifications. Corregidos DataTable API y PageHeader backTo. |
| 2026-02-26 | F5 mejoras | DetailModal reutilizable, ClientDetailModal + TaskDetailModal, acciones condicionales por status (swift-slate parity), styleTokens centralizados, padding uniforme p-2.5, páginas de detalle eliminadas (todo vía modales). |
| 2026-02-26 | F5 mejoras (cont.) | Color tokens CSS variables (tailwind.config + styleTokens sin hardcoded). EntityPickerField genérico reutilizable. EmployeeForm + servicio/hook (infraestructura F10). TaskForm con EntityPickerField + nested EmployeeForm. Logos (src/assets), favicon, DesktopSidebar con logo. Build 0 errores. |
| 2026-02-26→03-03 | F7 ✅ | Estimates completo: EstimatesPage, CreateResidential (11 pasos), CreateCommercial (7 pasos inicial), modales, pricing hooks, PDF, rutas. |
| 2026-03-03 | F7 refinamiento ✅ | Refactor SOLID: step components aislados, EstimateFormLayout, steps.config. Draft system (useDraftEstimate, DraftRecoveryDialog, ExitConfirmationDialog, DraftStatusIndicator). Commercial: 8 pasos (añadido CommPreviewStep con ProposalPreview completa + Download PDF via jsPDF). CommPropertyStep: Select Days separado + Contract Duration. CommMainStep: 4 Cards + End Time auto-calculado. CommDetailsStep: textos validados contra swift-slate. EstimateDetailsModal: datos reales de draft desde draft_data JSON. Draft restore async (fetch client/lead desde DB). EstimatesPage: acciones draft (Continue/Start Fresh/Delete). Limpieza: dir schemas/ vacío eliminado. |
| 2026-03-05 | F8 refinamiento ✅ + Shared | Invoice form: flujo correcto (Next→preview siempre, footer Cancel/Save/Next en edición). DeliveryMethodSelector shared. InvoicePreviewPage: Email/SMS/Both. InvoiceDetailsModal: actions por status. ClientDetailModal + LeadDetailModal: live refresh (useClient/useLead). AddressAutocomplete (Google Places) en ClientForm y LeadForm. useGoogleMaps hook. Build: 0 errores. |
| 2026-03-06 | F9 ✅ | Scheduling completo: RoutesPage (Calendar/Map toggle, RouteSelector), AddAppointmentPage wizard 10 pasos, AppointmentDetailModal (two-column cards + employees inline + Quick Actions: Edit+Delete), SmartMapPage. SMS: useSendAppointmentSMS + useSendAppointmentEmail. EmployeeForm: Available Days + Upload Documents. Pendiente: Google Maps en AppointmentDetailModal. Build: 0 errores. |
| 2026-03-06 | F10A ✅ | Employees completo: EmployeesPage (KPI×4, tabs, search, lista avatar+badge). EmployeeDetailsModal (two-column Cards: Personal/Address/Employment/Notes/Availability/Documents/Timeline/Quick Actions). EmployeeForm edit mode (employeeId prop, prefill, useUpdateEmployee, existing docs). generateEmployeeSheetPDF (jsPDF portado de swift-slate). useEmployees extendido (useAllEmployees, useEmployee, useUpdateEmployee, useUpdateEmployeeStatus, useDeleteEmployee+guard). Router /employees. Build: 0 errores. |
| 2026-03-04 | F10A refinamientos ✅ | EmployeesPage rediseñada: patrón unificado con Estimates (single Card KPI border-l-4, Toolbar Card, Table 6 cols + dropdown). CRM KPI cards al mismo patrón. Fix available_days lowercase normalization en EmployeeForm + generateEmployeeSheetPDF. Fix LoadingSpinner centrado en TableCell. Build: 0 errores. |
| 2026-03-04 | F11 Walkthroughs ✅ | WalkthroughsPage (KPI + tabla + QR dialog). WalkthroughForm modal. WalkthroughDetailsModal (2 cols + Quick Actions por status). ResidentialWalkthroughFormPage + CommercialWalkthroughFormPage (públicas). SOLID refactor: config/, utils/, PickerDialog, FloatInput (type=text+inputMode). Side-effects movidos a onSuccess. fetchContactInfo centralizado. DraftRecoveryDialog eliminado de estimates. Fix: prefill desde walkthrough a estimate form (location.state.prefill). Build: 0 errores. |
| 2026-03-04 | F12 Settings ✅ | ProfilePage split-panel (avatar clickable + info rows coloreados + nav list / form activo). settingsSchemas (3 schemas Zod). settingsService + useSettings (5 hooks). EditProfilePage, EditCompanyInfoPage, SecurityPage (standalone). ContactCardPage pública (vCard .vcf). PrivacyPage estática. ContractPage coming soon. Save+Cancel cuando isDirty. Build: 0 errores. |
| 2026-03-04 | F14 Servicios ✅ | Los 5 shared services ya existían: StorageService, GeolocationService, PDFService, ShareService, FileService. Auditoría: cero @capacitor/* imports, cero Capacitor.isNativePlatform(). |
| 2026-03-04 | F15 SOLID ✅ | queryKeys.ts (QK centralizado). ErrorBoundary + wrapping en routes/index.tsx. SRP: WalkthroughsPage usa useAuth()+useSendWalkthroughStart(), CommercialEstimates usa useProfile()+fetchClient/fetchLead desde services, CreateInvoicePage usa QK.clientsForInvoice. JSDoc completo en employeesService.ts. Build: npm run build → 0 errores. Descubierto: /time-clock ausente del plan → añadido como F19. |
| 2026-03-04 | Auditoría mapas | Inventario completo de todas las integraciones de Google Maps en swift-slate vs thunder_dashboard. SmartMapView ya usa Google Maps (no Mapbox — nota anterior incorrecta). F20 agregado: AppointmentDetailModal map fix, SmartMap geocoding audit, EmployeeLocationMap (F19 cruzada), RealTimeLocationMap/LocationMap (F10B cruzada). |

---

> **¿Cómo continuar en una nueva sesión?**
> Abre Claude Code desde `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`, escribe "continúa con el plan" y leeré este archivo para retomar desde donde quedamos.
