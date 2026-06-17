# Thunder Dashboard — Instrucciones permanentes para Claude

> Este archivo es cargado automáticamente por Claude Code al inicio de cada sesión.
> Contiene las reglas de trabajo que aplican a TODAS las fases del proyecto.

---

## Estado del proyecto (actualizado 2026-06-16)

**Fases completadas:** F0 (parcial), F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F14, F15, F19, F20, F21
**New Workflow completado:** Booking→Requests, CRM separado (Leads/Clients/Tasks), Client Properties, ContactPicker, Jobs (infra+UI+PDF), Flujo de conversión Request→Estimate/Walkthrough→Job, AddRequest manual, limpieza de código muerto
**Fase activa:** ninguna — next: F19 Time Clock items faltantes (TimeLineView, ShiftDetails) o features menores
**Pendientes bloqueadas:** F13 (suscripciones — decisiones negocio), F16 (i18n), F17 (testing), F18 (CI/CD AWS)

---

## Fuentes de verdad

| Qué | Fuente |
|-----|--------|
| Lógica de negocio, flujos, textos | `swift-slate` → `/Users/diegoparedes/Documents/Desarrollo/swift-slate` |
| UX/UI, layout, componentes visuales | `thunder-web-version` → `/Users/diegoparedes/Documents/Desarrollo/thunder-web-version` |
| Backend / DB | Supabase compartido — **NO tocar nada del backend** |

---

## Reglas de implementación (aplican siempre)

### Textos
- Todos los textos visibles deben coincidir EXACTAMENTE con `swift-slate`
- Nunca inventar texto nuevo — buscar siempre el string original en swift-slate

### Arquitectura (SOLID + feature-based)
- **Page = orchestrator delgado**: solo useState + hooks + renderStep(). Sin lógica de negocio directa
- **Step/form components**: dumb, reciben solo sus props, emiten onChange callbacks
- **Hooks**: toda lógica de servidor (queries, mutations, edge functions) va en hooks dentro de `features/<feature>/hooks/`
- **Services**: toda lógica de Supabase va en `features/<feature>/services/`. Las páginas nunca llaman a Supabase directamente
- **No Context para wizard forms** — useState local en la página
- **Shared**: solo componentes/hooks genuinamente reutilizables entre features van en `src/shared/`

### Inputs numéricos
- **NUNCA usar `<Input type="number">`** — tiene UX inconsistente entre browsers y permite valores inesperados
- Usar siempre `<Input type="text">` con `inputMode="numeric"` (enteros) o `inputMode="decimal"` (decimales)
- Aplicar sanitización en `onChange` con las utilidades de `src/shared/utils/numericInput.ts`:
  - `toIntegerString` → solo dígitos enteros (conteos, metraje, cantidades)
  - `toDecimalString` → dígitos con un punto decimal (precios, tarifas, duraciones)
- Ejemplo:
  ```tsx
  import { toIntegerString, toDecimalString } from "@/shared/utils/numericInput";
  <Input type="text" inputMode="numeric" value={val} onChange={(e) => setVal(toIntegerString(e.target.value))} />
  ```

### Colores y estilos
- Usar siempre las variables CSS del theme (`text-primary`, `bg-muted`, `text-foreground`, etc.)
- Nunca hardcodear colores hex o clases de color arbitrarias
- Los colores semánticos (verde para éxito, rojo para destructivo) deben usar `text-green-600`, `text-destructive`, etc. — igual que en el resto del proyecto

### Patrones visuales establecidos
- **KPI cards**: patrón unificado `single Card` + `border-l-4` con color semántico — usado en CRM, Employees, Invoices, Time Clock, etc.
- **Toolbar**: `Card` con `Tabs` + `Search Input` + botón primario — patrón unificado
- **Tablas**: `DataTable` genérico con búsqueda, paginación, skeleton, empty state
- **Modales de detalle**: `DetailModal` + `InfoRow` + two-column grid — no navegación a página nueva
- **Wizard/formularios multi-paso**: modal full-screen (FullScreenModal) — NO página separada
- **Footer de wizard**: inline dentro del scroll (no fixed/sticky), `Cancel` outline izquierda, `Next` primary derecha, `max-w-2xl` centrado en desktop
- **Padding uniforme**: `p-2.5 space-y-2.5` en todas las páginas internas

### Wizards como modales full-screen
- Los wizards de creación (contratos, citas, estimates) son `FullScreenModal` abiertos desde la página principal con estado local (`showCreate`, `editId`)
- NO navegan a una ruta nueva — el estado vive en la página orchestradora
- Excepción: estimates sí usan rutas propias (`/estimates/new/residential`, `/estimates/new/commercial`)

### Componentes reutilizables disponibles
- `DetailModal` + `InfoRow` → `src/shared/components/common/DetailModal.tsx`
- `ConfirmDialog` → `src/shared/components/common/ConfirmDialog.tsx`
- `DeliveryMethodSelector` → `src/shared/components/DeliveryMethodSelector.tsx`
- `AddressAutocomplete` → `src/shared/components/AddressAutocomplete.tsx`
- `AddressRouteMap` → `src/shared/components/common/AddressRouteMap.tsx` (empresa→cliente con distancia/tiempo)
- `LoadingSpinner` → `src/shared/components/common/LoadingSpinner.tsx`
- `ErrorBoundary` → `src/shared/components/common/ErrorBoundary.tsx`
- `EntityPickerField` → `src/shared/components/common/EntityPickerField.tsx` (multi/single picker con búsqueda)
- `Avatar` / `InitialsAvatar` → `src/shared/components/common/Avatar.tsx`
- `useGoogleMaps` → `src/shared/hooks/useGoogleMaps.ts`
- `useProfile` + `getCompanyAddress` → `src/shared/hooks/useProfile.ts`
- `useAuth` → `src/shared/hooks/useAuth.ts`
- `EmployeeForm` (modal reutilizable) → `src/features/employees/components/EmployeeForm.tsx`
- `QK` (query keys centralizadas) → `src/shared/config/queryKeys.ts` — SIEMPRE usar QK.* en lugar de strings inline
- `styleTokens` (tokens de color) → `src/shared/constants/styleTokens.ts`

### Acciones en modales y páginas
- Las acciones disponibles (botones, menús) deben ser exactamente las de swift-slate
- Verificar siempre en swift-slate cuáles acciones existen y cuáles son dinámicas por estado

### Backend
- **NUNCA crear ni modificar archivos en `supabase/functions/`** — el backend no se toca
- Las edge functions ya están desplegadas en el mismo Supabase de swift-slate
- Solo crear hooks frontend que invoquen `supabase.functions.invoke(nombreExacto, { body })`
- Nombres de edge functions relevantes:
  - `send-estimate-email`, `send-estimate-sms`
  - `send-invoice-email`, `send-invoice-sms`, `stripe-create-checkout`
  - `send-appointment-emails` (plural), `send-appointment-sms`
  - `send-contract-email`, `send-contract-sms`
  - `generate-company-description` (Auto Generate en contratos)
  - `create-booking` (crea request desde dashboard o form público)
  - `send-job-status-emails` (notifica cambio de status de job)

### RPCs de conversión (ya desplegados en backend)
- `finalize_booking_conversion(p_booking_id, p_contact_type, p_contact_id, p_estimate_id?, p_walkthrough_id?)` — Request → Estimate/Walkthrough
- `finalize_estimate_to_job_conversion(p_estimate_id, p_job_id)` — Estimate → Job
- `finalize_walkthrough_to_estimate_conversion(p_walkthrough_id, p_estimate_id)` — Walkthrough → Estimate
- `cancel_recurring_job_series(p_job_id)` — cancela serie de jobs recurrentes

### Tabla `jobs` (no está en tipos locales de Supabase)
- Usar `(supabase as any).from('jobs')` en `jobsService.ts`
- Lo mismo para `client_properties` y `client_property_contacts`

### Tabla `bookings` — campos extendidos (migración aplicada)
- `client_id`, `lead_id`, `contact_type` ('client'|'lead'|'anonymous'), `client_property_id`
- `attachments` (JSONB array de BookingAttachmentMeta)

### Verificación obligatoria antes de terminar cada fase
1. `npx tsc --noEmit` → 0 errores
2. `npm run build` → 0 errores
3. Actualizar `PLAN.md`: marcar fase como ✅, añadir entrada al log de sesiones
4. Actualizar `MEMORY.md` con patrones nuevos descubiertos

---

## Inventario de features implementadas

| Feature | Ruta(s) | Estado |
|---------|---------|--------|
| Auth | `/auth`, `/forgot-password`, `/reset-password`, `/verify-email` | ✅ |
| Dashboard | `/home` | ✅ |
| Leads | `/leads` | ✅ |
| Clients | `/clients` (+ Properties en detail panel) | ✅ |
| Tasks | `/tasks` | ✅ |
| Notifications | `/notifications` | ✅ |
| Requests | `/requests`, `/requests/new`, `/requests/edit`, `/booking/:userId` (public) | ✅ |
| Estimates | `/estimates`, `/estimates/new/residential`, `/estimates/new/commercial`, `/public/estimate/:token` | ✅ |
| Jobs | `/jobs`, `/jobs/new`, `/jobs/:id`, `/jobs/:id/edit` | ✅ |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/:id/edit`, `/invoices/:id/preview`, `/invoice/payment/:id` (public) | ✅ |
| Scheduling | `/create-route`, `/create-route/:id/edit`, `/smart-map` | ✅ |
| Employees | `/employees` | ✅ |
| Walkthroughs | `/walkthroughs`, `/walkthroughs/new`, `/walkthroughs/:id/edit`, `/walkthrough/residential/:id`, `/walkthrough/commercial/:id` (public) | ✅ |
| Settings | `/profile`, `/edit-profile`, `/edit-company-info`, `/edit-security`, `/contact-card/:userId` (public) | ✅ |
| Time Clock | `/time-clock` | ✅ |
| Contracts | `/contracts` (FullScreenModal para create/edit) | ✅ |
| Subscriptions | `/profile` (tab suscripciones) | 🟡 parcial |

### Componentes shared relevantes (nuevos)
- `ServicePropertySelector` → `src/shared/components/common/ServicePropertySelector.tsx`
- `ContactPicker` + `ContactPickerValue` + `EMPTY_CONTACT` → `src/shared/components/common/ContactPicker.tsx`
- `PropertyForm` → `src/features/crm/clients/components/PropertyForm.tsx`
- `PropertyCard` → `src/features/crm/clients/components/PropertyCard.tsx`
- `JobStatusBadge` → `src/features/jobs/components/JobStatusBadge.tsx`
- `RequestForm` → `src/features/requests/components/RequestForm.tsx` (create/edit mode)
- `ConvertRequestDialog` → `src/features/requests/components/ConvertRequestDialog.tsx`

### Hooks relevantes (nuevos)
- `useClientProperties(clientId)` → `src/features/crm/clients/hooks/useClientProperties.ts`
- `useCustomQuestions()` → `src/features/requests/hooks/useCustomQuestions.ts`
- `useJobs()`, `useJob(id)` → `src/features/jobs/hooks/useJobs.ts`
- `useJobMutations` → `src/features/jobs/hooks/useJobMutations.ts`
- `useConvertEstimateToJob()` → `src/features/jobs/hooks/useConvertEstimateToJob.ts`

---

## Plan maestro
`/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard/PLAN.md`

**Para continuar en una nueva sesión:** escribe "continúa con el plan" y leeré el PLAN.md para retomar desde donde quedamos.
