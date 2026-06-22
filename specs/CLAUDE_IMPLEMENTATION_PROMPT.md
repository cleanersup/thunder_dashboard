# Prompt para Implementación — Thunder Dashboard

> Pegar este texto completo al inicio de un nuevo chat de Claude Code con el working directory apuntando a `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`

---

## Contexto del Proyecto

Estás trabajando en **Thunder Dashboard** (`/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard`), una SPA web responsive (React 18 + Vite + TypeScript + TanStack Query + shadcn/ui + Tailwind + Supabase) que es la versión desktop de la app móvil **Thunder Pro** (`/Users/diegoparedes/Documents/Desarrollo/swift-slate`, React + Capacitor).

Ambas apps usan el mismo backend Supabase self-hosted en AWS. Los tipos de DB están en `src/integrations/supabase/types.ts` y se actualizan manualmente (no hay CLI gen).

**Documentos de especificación completos:** `/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard/specs/`
- `SPEC_PART1_OVERVIEW.md` — visión general y alcance
- `SPEC_PART2_REQUESTS.md` — rename Booking → Requests
- `SPEC_PART3_CRM_SEPARATION.md` — separar CRM en Clients/Leads/Tasks
- `SPEC_PART3B_CLIENT_PROPERTIES.md` — Client Properties y ContactPicker (prerequisito de Jobs)
- `SPEC_PART4_JOBS.md` — feature Jobs completa
- `SPEC_PART5_CONVERSION_FLOW.md` — pipeline Request → Walkthrough → Estimate → Job
- `SPEC_PART6_DESIGN_UX.md` — diseño y UX
- `SPEC_PART7_ARCHITECTURE.md` — arquitectura técnica y reglas

**LEE ESTOS DOCUMENTOS ANTES DE EMPEZAR.** Son la fuente de verdad para esta implementación.

---

## Reglas Absolutas (nunca violar)

1. **Arquitectura de capas:** Pages → Hooks → Services → Supabase. Pages y components NUNCA importan `supabase` directamente.
2. **Query keys:** siempre desde `QK` en `src/shared/config/queryKeys.ts`. Nunca strings literales.
3. **Supabase import:** siempre desde `@/integrations/supabase/client`.
4. **Formularios:** siempre react-hook-form + Zod schema.
5. **JSDoc** en todas las funciones de service.
6. **No `as any`** salvo en `stripe_account_id`/`stripe_onboarding_completed` (documentado).
7. **Texto en inglés**, coincidiendo exactamente con swift-slate como fuente de verdad.
8. **Patrón de página:** `div.p-2.5.space-y-2.5` → Card KPI → Card Toolbar → Card Tabla.
9. **Lazy loading** para todas las páginas en `routes/index.tsx`.
10. **Lint + tsc** deben pasar antes de cada commit.

---

## Implementación a Realizar

### Orden de Ejecución

Implementar en este orden exacto para minimizar conflictos:

---

### TAREA 1 — Actualizar `planFeatures.ts` y `queryKeys.ts`

**Archivo:** `src/shared/config/planFeatures.ts`

Cambios:
- Renombrar `FeatureKey` `"booking"` → `"requests"`
- Añadir `"jobs"` al FeatureKey union
- Actualizar `PLAN_FEATURES`: `"booking"` → `"requests"` en essential/professional; añadir `"jobs"` en professional

```ts
export type FeatureKey =
  | "estimates" | "invoices" | "crm" | "routes" | "requests"
  | "smart_map" | "employee" | "time_clock" | "walkthrough" | "contracts"
  | "jobs";

export const PLAN_FEATURES: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "walkthrough", "invoices", "crm", "employee"],
  essential: ["estimates", "walkthrough", "invoices", "crm", "routes", "requests", "employee", "contracts"],
  professional: [
    "estimates", "walkthrough", "invoices", "crm", "routes", "requests",
    "employee", "smart_map", "time_clock", "contracts", "jobs",
  ],
};
```

**Archivo:** `src/shared/config/queryKeys.ts`

Añadir:
```ts
// Requests (renombrado de bookings)
requests:          ["requests"]       as const,
requestForms:      ["request-forms"]  as const,
requestsCount:     ["requests-count"] as const,
request:           (id: string) => ["request", id]              as const,
requestConversion: (id: string) => ["request-conversion", id]  as const,

// Jobs (nuevo)
jobs:       ["jobs"]                          as const,
job:        (id: string) => ["job", id]       as const,
jobInvoices:(ids: string[]) => ["job-invoices", ids] as const,
```

Mantener las keys antiguas (`bookings`, etc.) como compatibilidad hasta que se terminen de migrar los archivos.

---

### TAREA 2 — Renombrar Booking → Requests

**2a. Renombrar carpeta feature**

```bash
# En el proyecto thunder_dashboard:
mv src/features/booking src/features/requests
```

Dentro de la carpeta renombrada, renombrar archivos:
- `BookingPage.tsx` → `RequestsPage.tsx`
- `BookingDetailModal.tsx` → `RequestDetailModal.tsx`
- `BookingDetailPanel.tsx` → `RequestDetailPanel.tsx`
- `EditBookingFormPage.tsx` → `EditRequestFormPage.tsx`
- `useBookings.ts` → `useRequests.ts`
- `booking.types.ts` → `request.types.ts`
- `bookingService.ts` → `requestsService.ts`

Actualizar imports internos en cada archivo.

**2b. Actualizar sidebar** (`src/shared/components/layout/DesktopSidebar.tsx`):
- Cambiar `path: "/booking"` → `path: "/requests"`
- Cambiar `label: "Booking"` → `label: "Requests"`
- Cambiar ícono `Calendar` → `CalendarClock` (importar de lucide-react)
- Cambiar `feature: "booking"` → `feature: "requests"`

**2c. Actualizar rutas** (`src/app/routes/index.tsx`):
- Actualizar imports del lazy para apuntar a los archivos renombrados
- Cambiar rutas `/booking` → `/requests` y `/booking/edit` → `/requests/edit`
- Añadir redirect: `<Route path="/booking" element={<Navigate to="/requests" replace />} />`
- **NO tocar** `<Route path="/booking/:userId" element={<PublicBookingFormPage />} />` — esta URL pública no cambia

**2d. En `RequestsPage.tsx` y `RequestDetailPanel.tsx`**: actualizar todos los textos UI:
- "Bookings" → "Requests"
- "New Booking" → "New Request"
- "Edit Booking" → "Edit Request"
- Los KPI labels: "Total Bookings" → "Total Requests", "New Bookings" → "New Requests"

**2e. En `useRequests.ts`**: cambiar todos los `QK.bookings` → `QK.requests` y `QK.bookingForms` → `QK.requestForms`

**2f. En `requestsService.ts`**: cambiar query key references a las nuevas

**Añadir `resolveOrCreateContact` a requestsService** — portarlo de `swift-slate/src/services/requestService.ts`. Esta función es necesaria para el ConvertRequestDialog (Tarea 5). Incluye:
- `findContactByEmail(email, userId)` — busca en clients y leads
- `findContactByNamePhone(name, phone, userId)` — fallback sin email
- `resolveOrCreateContact(request, userId)` — orquesta todo y crea lead si no hay match

---

### TAREA 3 — Separar CRM en 3 páginas

**3a. Ampliar `useCRMStats`** (`src/features/crm/hooks/useCRMStats.ts`):

Añadir al return:
```ts
activeLeads: number,       // leads.filter(l => l.status === 'active').length
hotLeads: number,          // leads.filter(l => l.priority === 'high').length
convertedLeads: number,    // leads.filter(l => l.status === 'won').length
inactiveClients: number,   // clients.filter(c => c.status === 'inactive').length
pendingTasks: number,      // tasks.filter(t => t.status === 'pending').length
inProgressTasks: number,   // tasks.filter(t => t.status === 'in_progress').length
completedTasks: number,    // tasks.filter(t => t.status === 'completed').length
```

**3b. Crear `LeadsPage`** (`src/features/crm/leads/pages/LeadsPage.tsx`):

Página con el patrón estándar:
- KPI: Total Leads | Active Leads | Hot Leads | Converted (`hsl(var(--info))` | `hsl(var(--success))` | `hsl(var(--warning))` | `hsl(var(--purple-vibrant))`)
- Toolbar: filtro de status (All/Active/Won/Lost/Archived) + búsqueda + [+ Add Lead]
- Contenido: `<LeadsKanban />` existente, recibiendo los filtros como props

Si `LeadsKanban` no acepta filtros externos actualmente, adaptarlo para aceptar `searchQuery` y `statusFilter` como props.

**3c. Crear `ClientsPage`** (`src/features/crm/clients/pages/ClientsPage.tsx`):

- KPI: Total Clients | Active Clients | Inactive | (4to KPI — usar `allClients` del stats)
- Toolbar: filtro All/Active/Inactive + búsqueda + [+ Add Client]
- Contenido: `<ClientsTable />` existente

**3d. Crear `TasksPage`** (`src/features/tasks/pages/TasksPage.tsx`):

- KPI: Total Tasks | Pending | In Progress | Completed
- Toolbar: filtro por status + búsqueda + [+ Add Task]
- Contenido: `<TasksTable />` existente

**3e. Actualizar rutas** (`src/app/routes/index.tsx`):
```tsx
// Añadir imports lazy:
const LeadsPage   = lazy(() => import("@/features/crm/leads/pages/LeadsPage").then(m => ({ default: m.LeadsPage })));
const ClientsPage = lazy(() => import("@/features/crm/clients/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const TasksPage   = lazy(() => import("@/features/tasks/pages/TasksPage").then(m => ({ default: m.TasksPage })));

// Cambiar /crm a redirect y añadir rutas nuevas:
<Route path="/crm" element={<Navigate to="/leads" replace />} />
<Route path="/leads"   element={<ProtectedRoute requireFeature="crm"><LeadsPage /></ProtectedRoute>} />
<Route path="/clients" element={<ProtectedRoute requireFeature="crm"><ClientsPage /></ProtectedRoute>} />
<Route path="/tasks"   element={<ProtectedRoute requireFeature="crm"><TasksPage /></ProtectedRoute>} />
```

**3f. Actualizar sidebar** con las 3 entradas separadas y el nuevo orden (ver SPEC_PART3 y SPEC_PART6 para el orden completo del sidebar).

---

### TAREA 3C — Client Properties (prerequisito de Jobs)

**Spec completo:** `SPEC_PART3B_CLIENT_PROPERTIES.md`

Esta tarea es prerequisito de la Tarea 5 (AddJobPage). Sin el `ContactPicker` y el `ServicePropertySelector`, el formulario de job no puede funcionar.

**3C-a. Crear tipos** (`src/features/crm/clients/types/clientProperty.types.ts`):

Portarlo de `swift-slate/src/types/clientProperty.ts`. Incluye:
- `ClientPropertyContact`, `ClientPropertyContactFormData`
- `ClientProperty`, `ClientPropertyFormData`

**3C-b. Crear service** (`src/features/crm/clients/services/clientPropertyService.ts`):

Portarlo de `swift-slate/src/services/clientPropertyService.ts`. Usar `supabase as any` para todas las queries (las tablas no están en los tipos locales). JSDoc en todas las funciones.

Funciones:
```ts
export const clientPropertyService = {
  async getByClientId(clientId: string): Promise<ClientProperty[]>
  async create(clientId: string, form: ClientPropertyFormData): Promise<ClientProperty>
  async update(id: string, form: ClientPropertyFormData, clientId?: string): Promise<ClientProperty>
  async remove(id: string): Promise<void>
  async setPrimary(id: string): Promise<void>
  async createContact(propertyId: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact>
  async updateContact(id: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact>
  async deleteContact(id: string): Promise<void>
}
```

**3C-c. Añadir query key** a `src/shared/config/queryKeys.ts`:
```ts
clientProperties: (clientId: string) => ["client-properties", clientId] as const,
```

**3C-d. Crear hooks** (`src/features/crm/clients/hooks/useClientProperties.ts`):

Portarlo de `swift-slate/src/hooks/useClientProperties.ts`. Hooks a exportar:
- `useClientProperties(clientId)` — fetch lista
- `useCreateClientProperty(clientId)` — mutation crear
- `useUpdateClientProperty(clientId)` — mutation editar
- `useDeleteClientProperty(clientId)` — mutation eliminar
- `useSetPrimaryClientProperty(clientId)` — mutation marcar primary
- `useCreateClientPropertyContact(clientId)` — mutation crear contacto
- `useUpdateClientPropertyContact(clientId)` — mutation editar contacto
- `useDeleteClientPropertyContact(clientId)` — mutation eliminar contacto

Todas las mutations invalidan `QK.clientProperties(clientId)` en `onSuccess`.

**3C-e. Crear schema Zod** (`src/features/crm/clients/schemas/clientPropertySchema.ts`):
```ts
export const clientPropertySchema = z.object({
  title:      z.string().optional(),
  street:     z.string().min(1, 'Street is required'),
  apt_suite:  z.string().optional(),
  city:       z.string().min(1, 'City is required'),
  state:      z.string().min(1, 'State is required'),
  zip_code:   z.string().min(1, 'ZIP code is required'),
  country:    z.string().optional(),
  is_primary: z.boolean().default(false),
});
```

**3C-f. Crear `PropertyForm`** (`src/features/crm/clients/components/PropertyForm.tsx`):

Modal dialog para crear/editar propiedades. Mismo patrón que `ClientForm`/`EmployeeForm`.

```tsx
interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  property?: ClientProperty;  // undefined = create, defined = edit
}
```

Campos: Title (opcional), Street, Apt/Suite (opcional), City, State, ZIP, Country (opcional), Is Primary (toggle).

Modo crear: `useCreateClientProperty(clientId).mutate(data)`.
Modo editar: `useUpdateClientProperty(clientId).mutate({ id: property.id, form: data })`.

**3C-g. Crear `PropertyCard`** (`src/features/crm/clients/components/PropertyCard.tsx`):

Card que muestra datos de una propiedad dentro del detail del cliente:
- Badge "Primary" si `property.is_primary`
- Título opcional + dirección completa
- Contacto en sitio si `property.client_property_contacts?.length > 0`
- Botones: [Set Primary] (si no es primary) | [Edit] | [Delete]

**3C-h. Actualizar `ClientDetailPanel` y `ClientDetailModal`**:

Añadir sección "Properties" al final del contenido del detail:

```tsx
// En el detail component:
const { data: properties = [] } = useClientProperties(client.id);
const [propertyFormOpen, setPropertyFormOpen] = useState(false);
const [editingProperty, setEditingProperty] = useState<ClientProperty | undefined>();

// Sección en el JSX:
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">Properties</h3>
    <Button size="sm" onClick={() => { setEditingProperty(undefined); setPropertyFormOpen(true); }}>
      <Plus className="w-3.5 h-3.5 mr-1" /> Add Property
    </Button>
  </div>
  {properties.length === 0 ? (
    <p className="text-sm text-muted-foreground">No properties yet</p>
  ) : (
    properties.map(p => (
      <PropertyCard
        key={p.id}
        property={p}
        clientId={client.id}
        onEdit={(prop) => { setEditingProperty(prop); setPropertyFormOpen(true); }}
      />
    ))
  )}
</div>

<PropertyForm
  open={propertyFormOpen}
  onOpenChange={setPropertyFormOpen}
  clientId={client.id}
  property={editingProperty}
/>
```

---

### TAREA 3D — ServicePropertySelector y ContactPicker

**3D-a. Crear `ServicePropertySelector`** (`src/shared/components/common/ServicePropertySelector.tsx`):

Portarlo de `swift-slate/src/components/common/ServicePropertySelector.tsx`.

Comportamiento:
- Si `!clientId` o no hay propiedades → `return null`
- Al cambiar `clientId` → resetea selección via `onChange(null)`
- Al cargar propiedades: si no hay `value`, auto-selecciona la primary (o la `preferredPropertyId` si está set)
- Muestra un `Select` con las propiedades del cliente como opciones
- Bajo el select: muestra dirección completa de la propiedad seleccionada

```tsx
interface ServicePropertySelectorProps {
  clientId: string | null | undefined;
  value: ClientProperty | null;
  onChange: (property: ClientProperty | null) => void;
  preferredPropertyId?: string | null;
}
```

Para el Select, usar el componente `Select` de shadcn/ui existente en el proyecto, o `SearchableSelect` si existe. Ver cómo lo hacen los otros selects del proyecto.

**3D-b. Crear `ContactPicker`** (`src/shared/components/common/ContactPicker.tsx`):

Portarlo de `swift-slate/src/components/common/ContactPicker.tsx`.

```tsx
export interface ContactPickerValue {
  contactType: 'client' | 'lead' | null;
  client: ClientListItem | null;
  lead: LeadListItem | null;
  property: ClientProperty | null;
}

export const EMPTY_CONTACT: ContactPickerValue = {
  contactType: null, client: null, lead: null, property: null,
};

interface ContactPickerProps {
  value: ContactPickerValue;
  onChange: (next: ContactPickerValue) => void;
  showPropertySelector?: boolean;  // default: true
  error?: boolean;
  preferredPropertyId?: string | null;
  clientIdFromUrl?: string | null;
  leadIdFromUrl?: string | null;
  onUrlParamConsumed?: () => void;
}
```

Layout:
1. Toggle buttons [👤 Client] [💼 Lead] — cambian `contactType`
2. `SearchableSelect` (o `Select`) para elegir el cliente o lead
3. Si `contactType === 'client'` y `showPropertySelector`: renderizar `<ServicePropertySelector />`
4. Card de info del contacto seleccionado (nombre, email, teléfono)

`ClientListItem` y `LeadListItem` son los tipos que devuelven `useClients()` y `useLeads()`. Verificar qué tipos exportan esos hooks en thunder_dashboard y ajustar según corresponda.

Los props `clientIdFromUrl`/`leadIdFromUrl` permiten pre-seleccionar desde URL params (útil cuando se navega desde "Create Job for this client").

---

### TAREA 4 — Jobs Feature (infraestructura)

**4a. Crear `src/features/jobs/types/job.types.ts`**

Portarlo de `swift-slate/src/types/job.ts`. Incluir:
- Todos los tipos (JobStatus, JobStatusDb, PaymentStatus, ServiceType, etc.)
- Interfaces DbJob, Job, CreateJobInput, UpdateJobInput
- Funciones puras: `getEffectiveJobStatus`, `getJobDisplayBalanceDue`, `jobHasDeposit`

**4b. Crear `src/features/jobs/config/jobStatusConfig.tsx`**

Portarlo de `swift-slate/src/config/jobStatusConfig.tsx`. Incluir:
- `JOB_STATUS_COLOR`, `JOB_STATUS_BG`, `JOB_STATUS_BORDER`
- `JOB_STATUS_BADGE`, `JOB_STATUS_ICON`
- `JOB_STATUS_FILTER_OPTIONS`
- Tipo `JobStatusFilter`

**4c. Crear `src/features/jobs/services/jobsService.ts`**

Portarlo de `swift-slate/src/services/jobService.ts`. Ajustes:
- Import supabase desde `@/integrations/supabase/client`
- JSDoc en todas las funciones
- Mantener los mappers `dbToJob`, `jobStatusToDb`, etc.
- Mantener el envío de email al cancelar (`send-job-status-emails` edge function)
- El envío de SMS es opcional para web (puede omitirse)

Funciones:
```ts
export const jobsService = {
  async fetchAll(): Promise<Job[]>
  async fetchById(id: string): Promise<Job | null>
  async create(input: CreateJobInput): Promise<Job>
  async update(id: string, updates: UpdateJobInput, propertyId?: string | null): Promise<Job>
  async updateStatus(id: string, status: JobStatus): Promise<Job>
  async delete(id: string): Promise<void>
  async cancelGroup(groupId: string, fromJobId: string): Promise<void>
}
```

**4d. Crear hooks** en `src/features/jobs/hooks/`:

`useJobs.ts`:
```ts
export function useJobs(): UseQueryResult<Job[]>
export function useJob(id: string | undefined): UseQueryResult<Job | null>
```

`useJobMutations.ts`:
```ts
export function useUpdateJobStatus()
export function useCreateJob()
export function useUpdateJob()
export function useDeleteJob()
export function useCancelJobGroup()
```

`useJobInvoices.ts`:
```ts
export function useJobInvoices(invoiceIds: string[]): UseQueryResult<Invoice[]>
```

`useConvertEstimateToJob.ts` — portarlo de `swift-slate/src/hooks/useConvertEstimateToJob.ts`

**4e. Crear `src/features/jobs/schemas/jobSchema.ts`**

Schema Zod para el formulario de creación/edición.

---

### TAREA 5 — Jobs Feature (UI)

> Prerequisito: TAREA 3C y 3D deben estar completas. El `ContactPicker` y `ServicePropertySelector` son usados en `AddJobPage`.

**5a. Crear componentes** en `src/features/jobs/components/`:

`JobStatusBadge.tsx`:
```tsx
interface Props { status: JobStatus; size?: 'sm' | 'md'; }
export function JobStatusBadge({ status, size = 'md' }: Props)
```

`JobServiceItemRow.tsx` — fila de un ítem en el form (name, qty, unit_price, total, delete button)

`JobPricingSection.tsx` — sección de pricing con subtotal, discount, tax, total, deposit

`ConvertToJobButton.tsx` — botón que usa `useConvertEstimateToJob`

`JobCompleteDialog.tsx` — confirm dialog para marcar como completado

`JobDetailPanel.tsx` — panel lateral mostrando info del job (para JobsPage)

**5b. Crear `JobsPage`** (`src/features/jobs/pages/JobsPage.tsx`):

Patrón estándar de página con:
- KPIs: Total Jobs | Completed | Revenue | Completion Rate
- Toolbar: status filter (All/Draft/Upcoming/Today/Completed/Missed/Cancelled) + DatePicker + Search + [+ New Job]
- Tabla con columnas: Job # | Client | Date | Service | Total | Status | Actions
- Paginación 10/página
- Real-time subscription a tabla `jobs`
- Al click en fila → `JobDetailPanel` en Sheet lateral

**5c. Crear `AddJobPage`** (`src/features/jobs/pages/AddJobPage.tsx`):

Puerto de `swift-slate/src/pages/AddJob.tsx`. Layout desktop de 2 columnas (lg:grid-cols-2). Secciones:
1. Client / Lead (ContactPicker o similar)
2. Service Property (selector de propiedades del cliente)
3. Employee(s) multi-select
4. Job Type (Service Type + Frequency + Recurrence)
5. Schedule (Date + Start/End Time)
6. Services (line items dinámicos)
7. Pricing (Discount + Tax)
8. Deposit
9. Notes

Modos: crear (`/jobs/new`) y editar (`/jobs/:id/edit`), controlado por `useParams().id`.

**5d. Crear `JobDetailPage`** (`src/features/jobs/pages/JobDetailPage.tsx`):

Puerto de `swift-slate/src/pages/JobDetails.tsx`. Layout 2 columnas. Secciones:
- Header con status badge y acciones contextuales
- Job Information
- Client info
- Schedule
- Service Property
- Employees
- Services (line items, readonly)
- Pricing (readonly)
- Invoices (deposit + final, solo si Completed)
- Notes

**5e. PDF Generator** (`src/features/jobs/services/generateJobPDF.ts`):

Portarlo de `swift-slate/src/lib/jobPdfGenerator.ts`. Función exportada:
```ts
export async function generateJobPDF(
  job: Job,
  employees: { first_name: string; last_name: string }[],
  company?: CompanyInfo,
): Promise<void>
```

---

### TAREA 6 — Flujo de Conversión

**6a. Crear `ConvertRequestDialog`** (`src/features/requests/components/ConvertRequestDialog.tsx`):

Portarlo de `swift-slate/src/components/requests/ConvertRequestDialog.tsx`.

Dialog con 2 opciones: [Estimate] o [Walkthrough].

Al elegir Estimate:
1. Llamar `requestsService.resolveOrCreateContact(request)` para obtener/crear contacto
2. Construir `estimatePrefill` con datos del request
3. Navegar a `/estimates/new/residential` o `/estimates/new/commercial` con `{ state: { prefill, fromRequestId: request.id } }`

Al elegir Walkthrough:
1. Resolver contacto
2. Navegar a `/walkthroughs/new` con `{ state: { prefill: walkthroughPrefill, fromRequestId: request.id } }`

**6b. Actualizar `RequestDetailPanel`** para incluir el botón "Convert Request" que abre `ConvertRequestDialog`. El botón solo se muestra si `request.status === 'new'`.

También mostrar el linked record cuando `request.status === 'converted'`:
- Si `converted_to_type === 'estimate'` → link a `/estimates` con el id
- Si `converted_to_type === 'walkthrough'` → link a `/walkthroughs` con el id

**6c. Actualizar `AddWalkthroughPage`** para recibir `location.state.prefill` con datos del request y `location.state.fromRequestId`. En `onSuccess` de crear walkthrough, si `fromRequestId` existe:
```ts
await supabase.rpc('finalize_booking_conversion', {
  p_booking_id: fromRequestId,
  p_walkthrough_id: newWalkthrough.id,
  p_contact_type: contact.type,
  p_contact_id: contact.id,
});
qc.invalidateQueries({ queryKey: QK.requests });
```

**6d. Actualizar `CreateResidentialEstimatePage` y `CreateCommercialEstimatePage`** para recibir `location.state.fromRequestId`. En `onSuccess` de crear estimate, si `fromRequestId` existe:
```ts
await supabase.rpc('finalize_booking_conversion', {
  p_booking_id: fromRequestId,
  p_estimate_id: newEstimate.id,
  p_contact_type: contactType,
  p_contact_id: contactId,
});
qc.invalidateQueries({ queryKey: QK.requests });
```

Verificar primero si esto ya está parcialmente implementado — puede que solo falte el `fromRequestId` check.

**6e. Actualizar `EstimateDetailPanel`** para mostrar botón "Convert to Job" cuando:
- `estimate.status === 'accepted'`
- No tiene `converted_to_job_id` aún

```tsx
<ConvertToJobButton estimate={estimate} />
```

---

### TAREA 8 — Actualizar rutas y sidebar para Jobs

**`routes/index.tsx`**:
```tsx
const JobsPage      = lazy(() => import("@/features/jobs/pages/JobsPage").then(m => ({ default: m.JobsPage })));
const AddJobPage    = lazy(() => import("@/features/jobs/pages/AddJobPage").then(m => ({ default: m.AddJobPage })));
const JobDetailPage = lazy(() => import("@/features/jobs/pages/JobDetailPage").then(m => ({ default: m.JobDetailPage })));

// Rutas:
<Route path="/jobs"          element={<ProtectedRoute requireFeature="jobs"><JobsPage /></ProtectedRoute>} />
<Route path="/jobs/new"      element={<ProtectedRoute requireFeature="jobs"><AddJobPage /></ProtectedRoute>} />
<Route path="/jobs/:id"      element={<ProtectedRoute requireFeature="jobs"><JobDetailPage /></ProtectedRoute>} />
<Route path="/jobs/:id/edit" element={<ProtectedRoute requireFeature="jobs"><AddJobPage /></ProtectedRoute>} />
```

**Sidebar**: Añadir `{ path: "/jobs", icon: Briefcase, label: "Jobs", feature: "jobs" }` en la posición correcta (después de Estimates, antes de Invoices).

---

### TAREA 9 — Verificación Final

1. `npm run lint` → sin errores nuevos
2. `npx tsc --noEmit` → 0 errores
3. Navegar a cada ruta nueva en el browser y verificar que carga
4. Probar el flujo completo: crear Request → Convert to Estimate → Convert to Job
5. Probar flujo alternativo: crear Request → Convert to Walkthrough → Convert to Estimate → Convert to Job
6. Verificar que CRM redirect (`/crm` → `/leads`) funciona
7. Verificar que `/booking/:userId` (public form) sigue funcionando
8. Verificar que el sidebar muestra todas las entradas correctas

---

## Notas Importantes

### ContactPicker

Para el formulario de Job, se necesita un `ContactPicker` que permita seleccionar entre Clients y Leads. En swift-slate existe en `src/components/common/ContactPicker.tsx`. Verificar si hay algo similar en thunder_dashboard. Si no existe, crear `src/shared/components/common/ContactPicker.tsx` portándolo de swift-slate.

### EmployeeMultiSelect

Para seleccionar múltiples empleados en el job form. En thunder_dashboard puede existir en `features/employees/components/`. Si no, crear uno o reutilizar el `EntityPickerField` de tasks.

### InvoiceJobService

`swift-slate/src/services/invoiceJobService.ts` maneja la creación automática de invoices al activar/completar jobs. Este comportamiento lo hace el **trigger del backend**, no el frontend. El frontend solo necesita:
1. Al activar (Draft → Upcoming con depósito): puede que el trigger cree la deposit invoice automáticamente
2. Al completar: el trigger crea la final invoice

Verificar con el backend qué triggers existen antes de implementar lógica de invoice creation en el frontend.

### Preferencia de Sesión Anterior

El usuario prefiere respuestas cortas y sin resúmenes al final. Implementar directamente sin pedir confirmación para cada subtarea. Si hay una duda bloqueante, preguntar una sola vez y esperar respuesta antes de continuar.

### Fuente de Verdad para Strings

Todo texto visible en la UI debe coincidir EXACTAMENTE con swift-slate. Si hay dudas sobre algún label, buscar primero en swift-slate antes de inventar texto nuevo.
