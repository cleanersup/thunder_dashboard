# Thunder Dashboard — Plan Maestro de Migración Web

> **Estado actual:** 🟢 En progreso
> **Fase activa:** Fase 9 — Scheduling
> **Última actualización:** 2026-03-05
> **Sesión anterior:** F8 refinamiento + mejoras CRM/Shared. Invoice flow corregido (Next siempre va al preview en create y edit, footer Cancel/Save/Next igual a swift-slate). InvoicePreviewPage: delivery Email/SMS/Both. InvoiceDetailsModal: quick actions por status (Draft/Pending/Paid/Cancelled). ClientDetailModal + LeadDetailModal: live refresh via useClient/useLead (datos frescos al editar sin cerrar modal). AddressAutocomplete (Google Places) en ClientForm y LeadForm. Shared: DeliveryMethodSelector, AddressAutocomplete, useGoogleMaps. Build: 0 errores.

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
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10 → F11 → F12 → F14 → F15 → F13 → F16 → F17 → F18
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
> Estado: 🟡 Parcialmente iniciada (infraestructura base creada en F5 mejoras)

### Gestión Interna
- [x] `features/employees/services/employeesService.ts` — fetchEmployees, createEmployee (JSDoc)
- [x] `features/employees/hooks/useEmployees.ts` — useEmployees, useCreateEmployee
- [x] `features/employees/schemas/employeeSchema.ts` — Zod schema completo
- [x] `features/employees/components/EmployeeForm` — modal de creación (usado inline en TaskForm)
- [ ] `features/employees/hooks/useEmployeeDetails.ts`, `useShiftEdit.ts`
- [ ] `features/employees/components/EmployeesList`, `EmployeeDetails`
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

---

> **¿Cómo continuar en una nueva sesión?**
> Abre Claude Code desde `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`, escribe "continúa con el plan" y leeré este archivo para retomar desde donde quedamos.
