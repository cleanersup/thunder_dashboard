# Especificación — Parte 2: Renombrar Booking → Requests

## Objetivo

Renombrar el módulo "Booking" a "Requests" en la UI, rutas y código del dashboard, para alinearlo con swift-slate donde el módulo ya se llama "Requests".

**Fuente de verdad en swift-slate:**
- `src/pages/Requests.tsx`
- `src/pages/RequestDetails.tsx`
- `src/pages/AddRequest.tsx`
- `src/pages/EditRequest.tsx`
- `src/services/requestService.ts`
- `src/hooks/useRequests.tsx`
- `src/hooks/useRequest.tsx`
- `src/types/request.ts`

---

## Cambios Requeridos

### 1. Sidebar (`src/shared/components/layout/DesktopSidebar.tsx`)

**Antes:**
```ts
{ path: "/booking", icon: Calendar, label: "Booking", feature: "booking" }
```

**Después:**
```ts
{ path: "/requests", icon: CalendarClock, label: "Requests", feature: "requests" }
```

- Ícono: `CalendarClock` (lucide-react) — igual que en swift-slate navConfig
- Color asociado en swift-slate: `bg-amber-500` (solo relevante para mobile, no aplica al sidebar web)
- Importar `CalendarClock` en DesktopSidebar

### 2. Rutas (`src/app/routes/index.tsx`)

**Rutas protegidas — cambiar:**
```tsx
// Antes
<Route path="/booking" element={<ProtectedRoute requireFeature="booking"><BookingPage /></ProtectedRoute>} />
<Route path="/booking/edit" element={<ProtectedRoute requireFeature="booking"><EditBookingFormPage /></ProtectedRoute>} />

// Después
<Route path="/requests" element={<ProtectedRoute requireFeature="requests"><BookingPage /></ProtectedRoute>} />
<Route path="/requests/edit" element={<ProtectedRoute requireFeature="requests"><EditBookingFormPage /></ProtectedRoute>} />
```

**Ruta pública — NO CAMBIAR (es la URL que se comparte con clientes):**
```tsx
<Route path="/booking/:userId" element={<PublicBookingFormPage />} />
```

**Redirección de compatibilidad (opcional pero recomendada):**
```tsx
<Route path="/booking" element={<Navigate to="/requests" replace />} />
```

### 3. Plan Features (`src/shared/config/planFeatures.ts`)

**Actualizar FeatureKey:**
```ts
// Antes
export type FeatureKey =
  | "estimates" | "invoices" | "crm" | "routes" | "booking"
  | "smart_map" | "employee" | "time_clock" | "walkthrough" | "contracts";

// Después
export type FeatureKey =
  | "estimates" | "invoices" | "crm" | "routes" | "requests"
  | "smart_map" | "employee" | "time_clock" | "walkthrough" | "contracts"
  | "jobs";   // se añade aquí también, ver Parte 4
```

**Actualizar PLAN_FEATURES:**
```ts
// Reemplazar "booking" por "requests" en todos los tiers
const PLAN_FEATURES: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "walkthrough", "invoices", "crm", "employee"],
  essential: ["estimates", "walkthrough", "invoices", "crm", "routes", "requests", "employee", "contracts"],
  professional: [
    "estimates", "walkthrough", "invoices", "crm", "routes", "requests",
    "employee", "smart_map", "time_clock", "contracts", "jobs",
  ],
};
```

### 4. Query Keys (`src/shared/config/queryKeys.ts`)

Añadir las nuevas keys y mantener las viejas como alias durante la transición:

```ts
export const QK = {
  // ... existentes ...

  // Requests (antes "bookings")
  requests:      ["requests"]        as const,
  requestForms:  ["request-forms"]   as const,
  requestsCount: ["requests-count"]  as const,
  request:       (id: string) => ["request", id] as const,
  requestConversion: (id: string) => ["request-conversion", id] as const,

  // Jobs (nuevo — ver Parte 4)
  jobs:          ["jobs"]            as const,
  job:           (id: string) => ["job", id]     as const,
  jobInvoices:   (ids: string[]) => ["job-invoices", ids] as const,
}
```

> Las keys `bookings`, `bookingForms`, `bookingsCount` pueden mantenerse temporalmente y eliminarse cuando no haya más referencias.

### 5. Archivos de Feature (`features/booking/`)

**Opción A — Renombrar la carpeta** (recomendada, más limpia):
```
features/booking/ → features/requests/
```
Actualizar todos los imports internos y en routes/index.tsx.

**Opción B — Mantener la carpeta booking** y solo cambiar rutas/labels:
Más rápido, menos limpio. Aceptable si el rename genera demasiado ruido de diff.

Para esta implementación se recomienda **Opción A**.

Archivos a renombrar/actualizar internamente:
- `BookingPage.tsx` → `RequestsPage.tsx`
- `BookingDetailModal.tsx` → `RequestDetailModal.tsx`
- `BookingDetailPanel.tsx` → `RequestDetailPanel.tsx`
- `EditBookingFormPage.tsx` → `EditRequestFormPage.tsx`
- `useBookings.ts` → `useRequests.ts`
- `booking.types.ts` → `request.types.ts`
- `bookingService.ts` → `requestsService.ts`
- `publicBookingSchema.ts` → `publicBookingSchema.ts` (sin cambio, es para el form público)

Dentro de los archivos, `booking` → `request` en nombre de funciones, variables y tipos donde aplique.

### 6. Navegación interna

Dentro de `BookingDetailPanel.tsx` / `BookingDetailModal.tsx`, hay botones que navegan a `Edit Booking`. Actualizar labels:
- "Edit Booking" → "Edit Request"
- "New Booking" → "New Request"
- Títulos de página "Bookings" → "Requests"

---

## Especificación Funcional de la Página Requests

La funcionalidad no cambia, solo el naming. Para referencia:

### KPIs (4 cards)
| KPI | Valor | Subtítulo | Color |
|-----|-------|-----------|-------|
| Total Requests | `bookings.length` | All time | primary |
| New Requests | `filter(b => b.status === 'new').length` | Awaiting action | green-vibrant |
| Residential | `filter(b => b.service_type === 'residential').length` | Service type | blue-vibrant |
| Commercial | `filter(b => b.service_type === 'commercial').length` | Service type | orange-vibrant |

### Filtros
- Status: all / new / cancelled / converted / archived
- Date: all / this_month / last_month
- Search: por nombre de cliente o email

### Status badges
```ts
const getStatusBadge = (status: string) => {
  if (status === "new")       return "bg-success-subtle text-success-subtle-foreground border-success-subtle-border";
  if (status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
};
```

### Acciones por request (desde el detail panel/modal)
- **Convert Request** → abre `ConvertRequestDialog` (nueva — ver Parte 5)
- **Edit Request** → navega a `/requests/edit?id=:id`
- **Copy Public Link** → copia `/booking/:userId` al clipboard
- **Cancel** → confirm dialog → marca como cancelled
- **Archive** → marca como archived
- **Delete** → confirm dialog → elimina (solo si status !== 'converted')

### States del request
```ts
type RequestStatus = 'new' | 'cancelled' | 'converted' | 'archived';
```

### Conversión (cuando status = 'converted')
El detail panel muestra la entidad a la que fue convertido:
- Si `converted_to_type === 'estimate'` → link al estimate con ícono de Receipt (azul)
- Si `converted_to_type === 'walkthrough'` → link al walkthrough con ícono de ClipboardList (verde)

---

## Archivos No Afectados

- `PublicBookingFormPage.tsx` — solo cambia de carpeta si se hace la rename, no cambia funcionalidad
- `publicBookingSchema.ts` — sin cambios
- Ruta `/booking/:userId` — sin cambios (URL pública compartida con clientes)
- Edge functions (backend) — sin cambios
