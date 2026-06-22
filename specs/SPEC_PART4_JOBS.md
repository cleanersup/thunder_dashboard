# Especificación — Parte 4: Feature Jobs (0 → Completa)

## Fuentes de Verdad en swift-slate

```
src/types/job.ts                    → tipos completos
src/config/jobStatusConfig.tsx      → colores, badges, íconos por status
src/services/jobService.ts          → todo el CRUD Supabase
src/hooks/useJobs.ts                → hooks de lista y detalle
src/hooks/useJobInvoices.ts         → invoices asociadas al job
src/hooks/useConvertEstimateToJob.ts → conversión estimate → job
src/pages/Jobs.tsx                  → página de lista
src/pages/AddJob.tsx                → formulario crear/editar
src/pages/JobDetails.tsx            → vista detalle
src/lib/jobPdfGenerator.ts          → generador de PDF
src/components/common/JobNotificationPicker.tsx → picker de notificaciones
src/utils/estimateJobConversion.ts  → helpers de conversión
```

---

## Estructura de Archivos a Crear

```
src/features/jobs/
├── types/
│   └── job.types.ts
├── config/
│   └── jobStatusConfig.tsx
├── services/
│   ├── jobsService.ts
│   └── generateJobPDF.ts
├── hooks/
│   ├── useJobs.ts
│   ├── useJob.ts
│   ├── useJobInvoices.ts
│   └── useConvertEstimateToJob.ts
├── schemas/
│   └── jobSchema.ts
├── components/
│   ├── JobStatusBadge.tsx
│   ├── JobServiceItemRow.tsx
│   ├── JobPricingSection.tsx
│   ├── ConvertToJobButton.tsx
│   ├── JobDetailPanel.tsx         ← side panel en JobsPage (desktop)
│   └── JobCompleteDialog.tsx
└── pages/
    ├── JobsPage.tsx
    ├── AddJobPage.tsx
    └── JobDetailPage.tsx
```

---

## 4.1 Types (`job.types.ts`)

Copiar directamente de `swift-slate/src/types/job.ts`. Ajustes necesarios:
- Cambiar import paths: `@/lib/utils` → no aplica (tipos puros)
- Añadir JSDoc a las interfaces principales

```ts
export type JobStatus =
  | 'Draft' | 'Scheduled' | 'Upcoming' | 'Today'
  | 'Ongoing' | 'Completed' | 'Missed' | 'Cancelled';

export type JobStatusDb =
  | 'draft' | 'scheduled' | 'upcoming' | 'today'
  | 'ongoing' | 'missed' | 'completed' | 'cancelled';

export type PaymentStatus =
  | 'no_deposit_required' | 'pending_deposit' | 'deposit_paid'
  | 'balance_due' | 'payment_completed';

export type JobContactType = 'client' | 'lead';
export type ServiceType = 'residential' | 'commercial';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'every_two_weeks' | 'monthly';
export type ServiceDurationUnit = 'months' | 'years';

export interface JobServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** DB row shape (snake_case) — mirror of swift-slate DbJob */
export interface DbJob {
  id: string;
  user_id: string;
  job_number: string;
  client_id: string | null;
  lead_id: string | null;
  contact_type: 'client' | 'lead';
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  property_street: string | null;
  property_apt: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  assigned_employees: string[];
  service_type: string;
  job_type: 'one_time' | 'recurring';
  recurring_frequency: string | null;
  recurring_duration: string | null;
  recurring_duration_unit: string | null;
  selected_week_days: string[];
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  line_items: DbLineItem[];
  service_details: string;
  internal_notes: string | null;
  subtotal: number;
  discount_type: 'amount' | 'percent';
  discount_value: number;
  discount_amount: number;
  tax_type: 'amount' | 'percent';
  tax_value: number;
  tax_amount: number;
  total_amount: number;
  deposit_required: boolean;
  deposit_type: 'amount' | 'percent';
  deposit_value: number;
  deposit_amount: number;
  balance_due: number;
  payment_status: string;
  amount_paid: number;
  status: JobStatusDb;
  estimate_id: string | null;
  invoice_ids: string[];
  deposit_invoice_id: string | null;
  group_id: string | null;
  parent_job_id: string | null;
  is_recurring_parent: boolean;
  created_at: string;
  updated_at: string;
}

/** Frontend-facing Job (camelCase) */
export interface Job {
  id: string;
  userId: string;
  jobNumber: string;
  clientId: string | null;
  leadId: string | null;
  contactType: JobContactType;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  propertyStreet: string | null;
  propertyApt: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  assignedEmployees: string[];
  serviceType: ServiceType;
  jobType: 'one_time' | 'recurring';
  recurringFrequency: RecurrenceFrequency | null;
  recurringDuration: string | null;
  recurringDurationUnit: ServiceDurationUnit | null;
  selectedWeekDays: string[];
  jobDate: string;
  startTime: string | null;
  endTime: string | null;
  serviceItems: JobServiceItem[];
  serviceDetails: string;
  internalNotes: string | null;
  subtotal: number;
  discountType: 'amount' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxType: 'amount' | 'percent';
  taxValue: number;
  taxAmount: number;
  total: number;
  depositRequired: boolean;
  depositType: 'amount' | 'percent';
  depositValue: number;
  depositAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  status: JobStatus;
  estimateId: string | null;
  invoiceIds: string[];
  depositInvoiceId: string | null;
  groupId: string | null;
  parentJobId: string | null;
  isRecurringParent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  contact: { type: 'client' | 'lead'; id: string; name: string; email?: string; phone?: string };
  propertyId?: string;
  propertyStreet?: string;
  propertyApt?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  assignedEmployees: string[];
  serviceType: ServiceType;
  jobType: 'one_time' | 'recurring';
  recurringFrequency?: RecurrenceFrequency;
  recurringDuration?: string;
  recurringDurationUnit?: ServiceDurationUnit;
  selectedWeekDays?: string[];
  jobDate: string;
  startTime?: string;
  endTime?: string;
  serviceItems: JobServiceItem[];
  serviceDetails?: string;
  internalNotes?: string;
  discountType?: 'amount' | 'percent';
  discountValue?: number;
  taxType?: 'amount' | 'percent';
  taxValue?: number;
  depositRequired?: boolean;
  depositType?: 'amount' | 'percent';
  depositValue?: number;
  status?: 'draft' | 'upcoming';
  estimateId?: string;
}

export type UpdateJobInput = Partial<CreateJobInput>;

/** Returns the effective status shown in the UI, accounting for time-based transitions */
export function getEffectiveJobStatus(job: Job): JobStatus {
  if (job.status === 'Cancelled' || job.status === 'Completed' || job.status === 'Missed') {
    return job.status;
  }
  if (job.status === 'Upcoming' || job.status === 'Scheduled') {
    const today = new Date();
    const [y, m, d] = job.jobDate.split('-').map(Number);
    const jobDateObj = new Date(y, m - 1, d);
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (jobDateObj.getTime() === todayNormalized.getTime()) return 'Today';
    if (jobDateObj < todayNormalized) return 'Missed';
  }
  return job.status;
}

export function getJobDisplayBalanceDue(job: Job): number {
  return Math.max(0, job.total - job.amountPaid);
}

export function jobHasDeposit(job: Job): boolean {
  return job.depositRequired && job.depositAmount > 0;
}
```

---

## 4.2 Status Config (`config/jobStatusConfig.tsx`)

Copiar de `swift-slate/src/config/jobStatusConfig.tsx` sin modificaciones. Ajustar imports de lucide-react y cambiar tipos al nuevo path.

---

## 4.3 Service (`services/jobsService.ts`)

Copiar de `swift-slate/src/services/jobService.ts`. Ajustes:
- Import `supabase` desde `@/integrations/supabase/client`
- Eliminar el envío de SMS (`send-job-status-sms`) si no es relevante para web, o mantenerlo
- El envío de email al cancelar (`send-job-status-emails`) se mantiene
- Mantener JSDoc en todas las funciones

**Funciones del servicio:**
```ts
export const jobsService = {
  /** Obtiene todos los jobs del usuario autenticado */
  async fetchAll(): Promise<Job[]>

  /** Obtiene un job por ID */
  async fetchById(id: string): Promise<Job | null>

  /** Crea un nuevo job */
  async create(input: CreateJobInput): Promise<Job>

  /** Actualiza campos editables de un job */
  async update(id: string, updates: UpdateJobInput): Promise<Job>

  /** Cambia el status de un job */
  async updateStatus(id: string, status: JobStatus): Promise<Job>

  /** Cancela un job individual */
  async cancel(id: string): Promise<Job>

  /** Cancela un job y todos los futuros del mismo grupo */
  async cancelGroup(groupId: string, fromJobId: string): Promise<void>

  /** Elimina un job (solo Draft) */
  async delete(id: string): Promise<void>
}
```

**mappers:**
```ts
function dbToJob(db: DbJob): Job  // camelCase mapping
function jobToDb(job: CreateJobInput): Partial<DbJob>  // snake_case mapping
function jobStatusToDb(status: JobStatus): JobStatusDb
function jobStatusFromDb(status: JobStatusDb): JobStatus
```

---

## 4.4 Hooks

### `hooks/useJobs.ts`
```ts
/** Lista todos los jobs del usuario */
export function useJobs(): UseQueryResult<Job[]>

/** Job individual */
export function useJob(id: string | undefined): UseQueryResult<Job | null>

/** Mutación: cambiar status */
export function useUpdateJobStatus(): UseMutationResult<...>

/** Mutación: crear job */
export function useCreateJob(): UseMutationResult<...>

/** Mutación: actualizar job */
export function useUpdateJob(): UseMutationResult<...>

/** Mutación: eliminar job */
export function useDeleteJob(): UseMutationResult<...>

/** Mutación: cancelar grupo recurrente */
export function useCancelJobGroup(): UseMutationResult<...>
```

Invalidaciones en onSuccess: `QK.jobs`, `QK.job(id)`

### `hooks/useJobInvoices.ts`
```ts
/** Obtiene las invoices asociadas a un job por sus IDs */
export function useJobInvoices(invoiceIds: string[]): UseQueryResult<Invoice[]>
```

Query key: `QK.jobInvoices(invoiceIds)`

### `hooks/useConvertEstimateToJob.ts`
Puerto exacto de `swift-slate/src/hooks/useConvertEstimateToJob.ts`.

```ts
interface ConvertOptions {
  estimate: FormattedEstimate;
  serviceLabel?: string;
  onStart: () => void;
  onFinally: () => void;
  onSuccess?: () => void;
}

export function useConvertEstimateToJob(): (options: ConvertOptions) => Promise<void>
```

Flujo:
1. `supabase.auth.getUser()` en service (no en el hook directamente)
2. INSERT en `jobs` tabla con datos mapeados del estimate
3. `supabase.rpc('finalize_estimate_to_job_conversion', { p_estimate_id, p_job_id })`
4. Si el RPC falla → hacer rollback (DELETE del job recién creado)
5. Invalidar `QK.jobs`, `QK.job(newJob.id)`, `QK.estimates`
6. Navegar a `/jobs/:id/edit` con state `{ fromEstimateId: estimate.id }`

---

## 4.5 QueryKeys (actualizar `queryKeys.ts`)

```ts
// Jobs
jobs:          ["jobs"]            as const,
job:           (id: string) => ["job", id]      as const,
jobInvoices:   (ids: string[]) => ["job-invoices", ids] as const,
```

---

## 4.6 JobsPage

**Ruta:** `/jobs`
**Archivo:** `features/jobs/pages/JobsPage.tsx`

### KPIs (4 cards)
| Card | Valor | Subtítulo | Color |
|------|-------|-----------|-------|
| Total Jobs | `jobs.filter(j => j.status !== 'Cancelled').length` | Active jobs | primary |
| Completed | `jobs.filter(j => j.status === 'Completed').length` | All time | success |
| Revenue | `formatCurrency(completedJobs.reduce((s,j) => s + j.total, 0))` | From completed | green-vibrant |
| Completion Rate | `Math.round(completed/(completed+missed)*100)%` | vs Missed | purple-vibrant |

### Toolbar
- Left: filtro de status (tabs o select): All | Draft | Upcoming | Today | Completed | Missed | Cancelled | Scheduled
- Right: DatePicker (filter por fecha), [Search por número/cliente], [+ New Job]

### Tabla (desktop)
```
| Job # | Client | Date | Service | Employees | Total | Status | Actions |
```
- `Job #`: badge con color según status + número
- `Status`: `JobStatusBadge` component
- `Actions`: DropdownMenu → View Details | Edit | Mark Completed | Cancel | Delete
- Paginación: 10/página
- Al hacer click en una fila → abre `JobDetailPanel` como side panel (igual que `BookingDetailPanel`)

### Vista mobile/tablet
- Cards en vez de tabla (mismo patrón que Requests page en mobile)

### Loading / Empty states
```tsx
// Loading
<TableCell colSpan={8}>
  <div className="flex justify-center py-8"><LoadingSpinner /></div>
</TableCell>

// Empty
<TableCell colSpan={8}>
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Briefcase className="w-12 h-12 text-muted-foreground/30 mb-3" />
    <p className="text-muted-foreground">No jobs found</p>
    <Button onClick={() => navigate('/jobs/new')}>Create your first job</Button>
  </div>
</TableCell>
```

---

## 4.7 AddJobPage (Formulario)

**Rutas:** `/jobs/new` (crear) y `/jobs/:id/edit` (editar)
**Archivo:** `features/jobs/pages/AddJobPage.tsx`

Puerto de `swift-slate/src/pages/AddJob.tsx`. Para desktop usar el layout estándar de página full (no modal).

### Layout Desktop
```
┌── Header sticky ────────────────────────────────────────────────┐
│  [← Back]   New Job / Edit Job              [Save Draft] [Save] │
└─────────────────────────────────────────────────────────────────┘
┌── Content (two-column on lg) ───────────────────────────────────┐
│  Columna izquierda:          │  Columna derecha:                 │
│  1. Client / Lead picker     │  5. Services (line items)         │
│  2. Service Property         │  6. Pricing (subtotal/disc/tax)   │
│  3. Employee(s) selector     │  7. Deposit                       │
│  4. Job Type (svc/freq)      │  8. Notes                         │
│  5. Schedule (date/time)     │                                   │
└─────────────────────────────────────────────────────────────────┘
```

Para mobile (< lg): layout single column, igual que swift-slate.

### Secciones del formulario

**1. Client / Lead**
- Usar `ContactPicker` existente en `shared/components/common/` (si existe) o creare uno nuevo
- Toggle: [Client] [Lead]
- Si es Client: mostrar selector de clientes activos con búsqueda
- Si es Lead: mostrar selector de leads

**2. Service Property**
- Solo visible cuando se selecciona un Client
- Selector de propiedades del cliente (`useClientProperties(clientId)`)
- Muestra la dirección de la propiedad seleccionada

**3. Employee(s)**
- Multi-select de empleados activos
- Usar `EmployeeMultiSelect` o componente similar existente

**4. Job Type**
- Service Type: [Residential] [Commercial] — toggle buttons
- Frequency: [One-Time] [Recurring] — toggle buttons
- Si Recurring:
  - Frequency select: Daily | Weekly | Every 2 Weeks | Monthly
  - Duration input + unit select (Months | Years)
  - Week days selector (Mon-Sun checkboxes, solo si weekly)

**5. Schedule**
- Job Date: DatePicker
- Start Time: input type="time" (HH:mm)
- End Time: input type="time" (HH:mm)

**6. Services (line items)**
- Lista de ítems: [Name input] [Qty input] [Unit Price input] [Total = qty × price]
- Botón "+ Add new item"
- Botón trash por ítem (mínimo 1 ítem)

**7. Pricing**
- Subtotal (calculado)
- Discount: toggle [$ Amount] [% Percent] + valor input → muestra `-$X.XX`
- Tax: toggle [$ Amount] [% Percent] + rate input → muestra `+$X.XX`
- Total (calculado)
- "+ Add Tax" toggle

**8. Deposit**
- Toggle "Require deposit"
- Si activado: [$ Amount] [% Percent] + valor
- Muestra el monto del depósito

**9. Notes**
- Service Details (textarea, public-facing)
- Internal Notes (textarea, solo visible para el owner)

### Validation (Zod schema)

```ts
// features/jobs/schemas/jobSchema.ts
export const jobSchema = z.object({
  contactType: z.enum(['client', 'lead']),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  serviceType: z.enum(['residential', 'commercial']),
  jobDate: z.string().min(1, 'Job date is required'),
  serviceItems: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Service name is required'),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number(),
  })).min(1, 'At least one service item is required'),
  // ... resto de campos opcionales
}).refine(data => {
  if (data.contactType === 'client') return !!data.clientId;
  return !!data.leadId;
}, { message: 'Please select a client or lead' });
```

### Prefill desde Estimate (para conversión)

Cuando se navega con `location.state.fromEstimateId`, la página AddJobPage NO se usa para esta conversión — la conversión la hace `useConvertEstimateToJob` directamente. Después de la conversión, navega a `/jobs/:id/edit` para que el usuario pueda ajustar fechas y empleados.

### Exit Confirmation

Igual que en swift-slate: si hay cambios sin guardar, mostrar dialog con opciones:
- Save as Draft
- Discard Changes
- Continue Editing

---

## 4.8 JobDetailPage

**Ruta:** `/jobs/:id`
**Archivo:** `features/jobs/pages/JobDetailPage.tsx`

Puerto de `swift-slate/src/pages/JobDetails.tsx`. Para desktop, este es un panel lateral (`JobDetailPanel`) que se abre al hacer click en una fila de la tabla, más que una página full. Sin embargo, también debe existir como ruta directa.

### Layout

```
┌── Header ───────────────────────────────────────────────────────┐
│  [← Back]  Job Details                         [⊕ Actions]      │
└─────────────────────────────────────────────────────────────────┘
┌── Status banner ────────────────────────────────────────────────┐
│  StatusBadge   [Status-specific action buttons]                  │
└─────────────────────────────────────────────────────────────────┘
┌── Content (two-column) ─────────────────────────────────────────┐
│  Columna izquierda:          │  Columna derecha:                 │
│  Job Information             │  Services                         │
│    Job Number                │    Line items                     │
│    Service Type              │  Pricing                          │
│    Frequency                 │    Subtotal / Discount / Tax      │
│  Client                      │    Total / Deposit / Balance      │
│    Name, Email, Phone        │  Invoices                         │
│  Schedule                    │    Deposit invoice card           │
│    Date                      │    Final invoice card             │
│    Start/End Time            │  Notes                            │
│  Property                    │    Service Details                │
│  Employees                   │    Internal Notes                 │
└─────────────────────────────────────────────────────────────────┘
```

### Status-based Actions

| Status | Acciones disponibles |
|--------|---------------------|
| Draft | Edit | Activate (→ Upcoming) | Delete |
| Upcoming | Edit | Reschedule | Mark as Completed | Cancel |
| Today | Edit | Reschedule | Mark as Completed | Cancel |
| Completed | Download PDF | View Invoice | (no más acciones) |
| Missed | Mark as Completed | Reschedule | Cancel |
| Cancelled | (solo lectura, botón Delete) |
| Scheduled (recurring future) | Edit | Cancel this / Cancel future |

### "Mark as Completed" flow

1. Mostrar `JobCompleteDialog` (confirm dialog)
2. Llamar `jobsService.updateStatus(id, 'Completed')`
3. Backend trigger crea la invoice final automáticamente
4. Refetch del job para obtener `invoice_ids` actualizado
5. Llamar `sendInvoiceEmail(finalInvoiceId)` (hook existente en features/invoices)
6. Mostrar modal de éxito con el monto de la invoice

### "+ Actions" button (esquina superior derecha)

DropdownMenu o Dialog con las acciones según el status actual del job.

### Invoices section

Muestra las invoices asociadas al job:
- **Deposit invoice** (si existe): card con status, monto, botón "Send" / "View"
- **Final invoice** (si status = Completed): card con status, monto, botón "Send" / "View"

---

## 4.9 PDF Generator (`services/generateJobPDF.ts`)

Puerto exacto de `swift-slate/src/lib/jobPdfGenerator.ts`.

```ts
/**
 * Generates a Job Work Order PDF.
 * @param job - The job data to render
 * @param employees - Employee names for the assigned employees section
 * @param company - Company info for the header (logo, name, contact)
 */
export async function generateJobPDF(
  job: Job,
  employees: { first_name: string; last_name: string }[],
  company?: CompanyInfo,
): Promise<void>
```

Color scheme: PRIMARY = [79, 129, 189] (azul — igual que invoices).

El PDF incluye:
- Header: logo + info de la empresa
- Job info: número, fecha, status, tipo de servicio
- Client info: nombre, email, phone, dirección
- Schedule: fecha, hora inicio/fin
- Employees asignados
- Line items table
- Pricing summary (subtotal, discount, tax, total, deposit, balance)
- Notes section
- Footer con número de job

---

## 4.10 Real-time Updates

En `JobsPage`, suscribirse a cambios en la tabla `jobs`:

```ts
useEffect(() => {
  const channel = supabase
    .channel('jobs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
      qc.invalidateQueries({ queryKey: QK.jobs });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [qc]);
```

---

## 4.11 Plan Features

Añadir `"jobs"` al `planFeatures.ts`:

```ts
export type FeatureKey = ... | "jobs";

export const PLAN_FEATURES = {
  basic: [...],           // jobs NO incluido
  essential: [...],       // jobs NO incluido
  professional: [..., "jobs"],  // jobs solo en Professional
};
```

Rutas de jobs deben usar `requireFeature="jobs"` en `ProtectedRoute`.

---

## 4.12 Sidebar

```ts
{ path: "/jobs", icon: Briefcase, label: "Jobs", feature: "jobs" }
```

Importar `Briefcase` de lucide-react. Añadir después de `/estimates` o después de `/walkthroughs` (ver Parte 3 para el orden completo).
