# Especificación — Parte 1: Visión General y Alcance

## Contexto del Proyecto

**Thunder Dashboard** es la migración web de la app móvil **Thunder Pro** (swift-slate, React + Capacitor). Es una SPA web responsive que corre en desktop (≥1024px sidebar fijo colapsable) y mobile (<1024px Sheet drawer). Backend: Supabase self-hosted en AWS (mismo de swift-slate, sin cambios de schema).

### Repositorios de Referencia

| Rol | Ruta |
|-----|------|
| **Este proyecto** | `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard` |
| App móvil (fuente de lógica) | `/Users/diegoparedes/Documents/Desarrollo/swift-slate` |
| Referencia UX/UI web | `/Users/diegoparedes/Documents/Desarrollo/thunder-web-version` |

---

## Estado Actual del Dashboard (2026-06-15)

### Features Implementadas ✅

| Feature | Ruta actual | Estado |
|---------|-------------|--------|
| Auth | `/auth` | ✅ Completa |
| Dashboard | `/home` | ✅ Completa |
| CRM (unificado) | `/crm` | ✅ Completa — **pendiente separar** |
| Estimates | `/estimates` | ✅ Completa |
| Invoices | `/invoices` | ✅ Completa |
| Scheduling | `/create-route` | ✅ Completa |
| Smart Map | `/smart-map` | ✅ Completa |
| Employees | `/employees` | ✅ Completa |
| Walkthroughs | `/walkthroughs` | ✅ Completa |
| Time Clock | `/time-clock` | ✅ Completa |
| Contracts | `/contracts` | ✅ Completa |
| Settings | `/profile` | ✅ Completa |
| Booking (Requests) | `/booking` | ✅ Completa — **pendiente renombrar** |

### Features Faltantes ❌

| Feature | Descripción |
|---------|-------------|
| **Jobs** | No existe en thunder_dashboard. Completamente nuevo. |
| **Clients (standalone)** | Existe dentro de CRM pero no tiene ruta propia. |
| **Leads (standalone)** | Existe dentro de CRM pero no tiene ruta propia. |
| **Tasks (standalone)** | Existe dentro de CRM pero no tiene ruta propia. |

---

## Alcance de Esta Implementación

### Cambio 1 — Renombrar "Booking" → "Requests"

El feature de `booking` en thunder_dashboard es funcionalmente el módulo **Requests** de swift-slate (la app móvil ya lo renombró). El nombre en la UI, rutas y código debe actualizarse.

**Impacto:**
- Sidebar: "Booking" → "Requests" (ícono: `CalendarClock`, color `amber-500`)
- Ruta protegida: `/booking` → `/requests`
- Ruta de edición: `/booking/edit` → `/requests/edit`
- **La ruta pública `/booking/:userId` NO cambia** (es la URL del formulario público que se comparte con clientes)
- `FeatureKey`: `"booking"` → `"requests"` en `planFeatures.ts`
- `QK.bookings` → renombrar a `QK.requests` (y `QK.request(id)`)
- Archivos afectados: `DesktopSidebar.tsx`, `routes/index.tsx`, `planFeatures.ts`, `queryKeys.ts`
- Las carpetas de feature (`features/booking/`) pueden renombrarse o mantenerse y actualizar solo las rutas

### Cambio 2 — Separar CRM en 3 páginas independientes

Actualmente `/crm` es una sola página con 3 tabs: Leads | Clients | Tasks. Deben convertirse en 3 páginas con rutas y entradas de sidebar propias.

| Sección | Ruta nueva | Componente principal |
|---------|-----------|---------------------|
| Leads | `/leads` | `LeadsPage` (kanban existente) |
| Clients | `/clients` | `ClientsPage` (tabla existente) |
| Tasks | `/tasks` | `TasksPage` (tabla existente) |

La ruta `/crm` se redirige a `/leads` (la vista más usada).

### Cambio 3 — Jobs (feature nueva, 0 → completa)

Nuevo módulo completo portado desde swift-slate. Ver Parte 4 para la especificación completa.

| Ruta | Descripción |
|------|-------------|
| `/jobs` | Lista de jobs con KPIs, filtros, paginación |
| `/jobs/new` | Formulario de creación |
| `/jobs/:id` | Vista detalle del job |
| `/jobs/:id/edit` | Formulario de edición |

### Cambio 4 — Flujo de Conversión Completo

Implementar el pipeline de conversión entre entidades:

```
Request → Walkthrough → Estimate → Job
       ↘                          ↗
         Estimate ────────────────
```

**Conversiones a implementar:**
1. **Request → Estimate**: ya existe navegación en BookingPage, pero falta el dialog de conversión con prefill
2. **Request → Walkthrough**: falta el dialog de conversión con prefill
3. **Walkthrough → Estimate**: ✅ ya existe en thunder_dashboard
4. **Estimate → Job**: ❌ falta completamente (hook `useConvertEstimateToJob`)

---

## Orden de Implementación Recomendado

```
1. Renombrar Booking → Requests     (bajo riesgo, solo strings y rutas)
2. Separar CRM → Clients/Leads/Tasks (bajo riesgo, refactor de routing)
3. Jobs — infraestructura base       (types, service, hooks, queryKeys)
4. Jobs — páginas UI                 (JobsPage, AddJobPage, JobDetailsPage)
5. Jobs — PDF generator              (port de jobPdfGenerator.ts)
6. Flujo de conversión               (ConvertRequestDialog, useConvertEstimateToJob)
7. planFeatures.ts — añadir "jobs"   (requiere decisión de plan tier)
```

---

## Restricciones Arquitectónicas Globales

Estas reglas aplican a TODOS los cambios y son no negociables:

1. **Arquitectura de capas** (Layer Cake):
   - `types/` → solo tipos, sin React, sin Supabase
   - `services/` → todo Supabase CRUD, sin hooks, sin JSX
   - `hooks/` → solo useQuery/useMutation wrapping services
   - `components/` → solo UI, sin llamadas directas a supabase
   - `pages/` → orchestrators delgados (hooks + layout), sin Supabase

2. **Importar Supabase siempre desde** `@/integrations/supabase/client` (nunca del path directo)

3. **React Query Keys**: siempre desde `QK` en `src/shared/config/queryKeys.ts`

4. **Formularios**: react-hook-form + Zod siempre

5. **Todo texto en inglés** (los strings deben coincidir exactamente con swift-slate)

6. **JSDoc paramétrico** en todas las funciones de servicio

7. **Lint + tsc --noEmit** deben pasar sin errores antes de cada commit

8. **planFeatures.ts** debe mantenerse en sync con swift-slate

9. **No `as any`** salvo en `stripe_account_id`/`stripe_onboarding_completed` (conocido)

10. **Estructura de página estándar** (establecida en F15):
    ```
    div.p-2.5.space-y-2.5
      Card KPI (border-l-4 grid-cols-2 lg:grid-cols-4)
      Card Toolbar (flex justify-between)
      Card Tabla/Lista (Table con paginación 10/página)
    ```
