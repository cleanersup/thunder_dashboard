# Especificación — Parte 7: Arquitectura Técnica y Especificaciones No Funcionales

## Stack Tecnológico (sin cambios)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React + TypeScript | 18 + 5.x |
| Build | Vite | 5.x |
| Routing | React Router | v6 |
| Server state | TanStack React Query | v5 |
| Forms | React Hook Form + Zod | latest |
| UI | shadcn/ui + Radix UI | latest |
| Styling | Tailwind CSS | v3 |
| Backend | Supabase (self-hosted AWS) | mismo |
| PDF | jsPDF | ^2.x |

---

## Arquitectura de Capas (Layer Cake)

Reglas absolutas. Cualquier violación es un bug arquitectónico que debe corregirse:

```
┌─────────────────────────────────────────────────────────────────┐
│ Pages (thin orchestrators)                                       │
│   - Solo hooks + layout                                          │
│   - CERO llamadas a supabase                                    │
│   - CERO imports desde services                                  │
│   - Máx ~300 líneas; si excede → extraer componentes/hooks      │
├─────────────────────────────────────────────────────────────────┤
│ Components (UI puro)                                             │
│   - Solo props + UI lógica                                       │
│   - CERO llamadas a supabase                                    │
│   - CERO service calls                                           │
├─────────────────────────────────────────────────────────────────┤
│ Hooks (React Query wrappers)                                     │
│   - useQuery / useMutation wrapping services                     │
│   - Derived state (useMemo, callbacks)                           │
│   - CERO llamadas directas a supabase                           │
├─────────────────────────────────────────────────────────────────┤
│ Services (Supabase CRUD)                                         │
│   - Todo el acceso a Supabase                                    │
│   - auth.getUser() vive aquí                                     │
│   - RPC calls viven aquí                                         │
│   - CERO React, CERO hooks                                       │
├─────────────────────────────────────────────────────────────────┤
│ Types (puro TypeScript)                                          │
│   - Interfaces, tipos, enums                                     │
│   - Funciones helper puras (getEffectiveJobStatus, etc.)         │
│   - CERO Supabase, CERO React                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reglas de Código

### 1. Imports de Supabase

```ts
// ✅ Correcto
import { supabase } from "@/integrations/supabase/client";

// ❌ Nunca
import { supabase } from "../../integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
```

### 2. React Query Keys

```ts
// ✅ Correcto — siempre desde QK
import { QK } from "@/shared/config/queryKeys";
useQuery({ queryKey: QK.jobs, queryFn: jobsService.fetchAll });

// ❌ Nunca
useQuery({ queryKey: ["jobs"], queryFn: ... });
useQuery({ queryKey: ["job", id], queryFn: ... });
```

### 3. Tipos de Supabase

- Los tipos están en `src/integrations/supabase/types.ts`
- NO auto-generarlos con CLI (self-hosted, actualización manual)
- Los tipos de la DB siempre en snake_case; frontend en camelCase
- Los mappers `dbToX()` y `xToDb()` van en el service

### 4. Formularios

```ts
// ✅ Siempre react-hook-form + Zod
const schema = z.object({ ... });
const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

// ❌ Nunca useState para cada campo de formulario
const [name, setName] = useState('');
const [email, setEmail] = useState('');
```

### 5. JSDoc

Todas las funciones de service deben tener JSDoc:

```ts
/**
 * Creates a new job in the database.
 * @param input - Job creation input data
 * @returns The created job in frontend camelCase format
 * @throws {Error} If the user is not authenticated
 */
async create(input: CreateJobInput): Promise<Job>
```

### 6. No `as any`

```ts
// ✅ Las únicas excepciones permitidas (documentadas):
const profile = data as any;  // stripe_account_id / stripe_onboarding_completed no están en tipos
const supabaseAny = supabase as any;  // RPCs no tipados

// ❌ Nunca como escape hatch para errores de TypeScript
const value = something as any;  // inaceptable
```

### 7. Error Handling en Mutations

```ts
// ✅ Patrón en mutations (hooks)
const mutation = useMutation({
  mutationFn: (input) => jobsService.create(input),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: QK.jobs });
    toast.success('Job created successfully');
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to create job');
  },
});
```

### 8. Lazy Loading de Páginas

Todas las páginas deben importarse con lazy() en routes/index.tsx:

```ts
const JobsPage = lazy(() =>
  import("@/features/jobs/pages/JobsPage").then(m => ({ default: m.JobsPage }))
);
```

### 9. Invalidaciones de Query

Siempre invalidar las queries relevantes después de una mutación:

```ts
// Al crear/editar un job:
qc.invalidateQueries({ queryKey: QK.jobs });
qc.invalidateQueries({ queryKey: QK.job(id) });

// Al convertir estimate a job:
qc.invalidateQueries({ queryKey: QK.jobs });
qc.invalidateQueries({ queryKey: QK.estimates });
qc.invalidateQueries({ queryKey: QK.estimate(estimateId) });

// Al convertir request a estimate/walkthrough:
qc.invalidateQueries({ queryKey: QK.requests });
qc.invalidateQueries({ queryKey: QK.request(requestId) });
```

---

## Estructura de Archivos

### Feature Jobs (nueva)

```
src/features/jobs/
├── config/
│   └── jobStatusConfig.tsx          ← port de swift-slate
├── types/
│   └── job.types.ts                 ← port de swift-slate
├── schemas/
│   └── jobSchema.ts                 ← Zod schema para el form
├── services/
│   ├── jobsService.ts               ← port de swift-slate jobService.ts
│   └── generateJobPDF.ts            ← port de swift-slate jobPdfGenerator.ts
├── hooks/
│   ├── useJobs.ts                   ← useJobs + useJob
│   ├── useJobMutations.ts           ← useCreateJob + useUpdateJob + useDeleteJob
│   ├── useJobInvoices.ts            ← facturas del job
│   └── useConvertEstimateToJob.ts   ← conversión estimate→job
├── components/
│   ├── JobStatusBadge.tsx           ← badge reutilizable
│   ├── JobServiceItemRow.tsx        ← fila de ítem en el form
│   ├── JobPricingSection.tsx        ← sección de pricing en el form
│   ├── JobDetailPanel.tsx           ← panel lateral en JobsPage
│   └── JobCompleteDialog.tsx        ← confirm dialog de completar job
└── pages/
    ├── JobsPage.tsx                 ← /jobs
    ├── AddJobPage.tsx               ← /jobs/new y /jobs/:id/edit
    └── JobDetailPage.tsx            ← /jobs/:id
```

### Feature Requests (rename de booking)

```
src/features/requests/               ← renombrado de features/booking/
├── components/
│   ├── RequestDetailModal.tsx       ← renombrado de BookingDetailModal
│   ├── RequestDetailPanel.tsx       ← renombrado de BookingDetailPanel
│   └── ConvertRequestDialog.tsx     ← NUEVO — port de swift-slate
├── hooks/
│   └── useRequests.ts               ← renombrado de useBookings.ts
├── pages/
│   ├── RequestsPage.tsx             ← renombrado de BookingPage
│   ├── EditRequestFormPage.tsx      ← renombrado de EditBookingFormPage
│   └── PublicBookingFormPage.tsx    ← sin cambio (URL pública no cambia)
├── schemas/
│   └── publicBookingSchema.ts       ← sin cambio
├── services/
│   └── requestsService.ts           ← renombrado + añadir resolveOrCreateContact
└── types/
    └── request.types.ts             ← renombrado de booking.types.ts
```

### CRM (separación)

```
src/features/crm/
├── clients/
│   ├── components/ (existentes)
│   ├── hooks/ (existentes)
│   ├── pages/
│   │   ├── ClientsPage.tsx          ← NUEVO
│   │   └── ClientWalletPage.tsx     ← existente
│   ├── schemas/ (existentes)
│   └── services/ (existentes)
├── leads/
│   ├── components/ (existentes)
│   ├── hooks/ (existentes)
│   ├── pages/
│   │   └── LeadsPage.tsx            ← NUEVO
│   ├── schemas/ (existentes)
│   └── services/ (existentes)
├── hooks/
│   └── useCRMStats.ts               ← existente, ampliar
├── types/ (existentes)
└── pages/
    └── CRMPage.tsx                  ← ELIMINAR (o convertir a redirect)

src/features/tasks/
├── components/ (existentes)
├── hooks/ (existentes)
├── pages/
│   └── TasksPage.tsx                ← NUEVO
├── schemas/ (existentes)
├── services/ (existentes)
└── types/ (existentes)
```

---

## Performance

### React Query — Stale Times

```ts
// Datos que cambian poco (profile, employees)
staleTime: 5 * 60 * 1000  // 5 minutos

// Datos operacionales (jobs, requests, invoices)
staleTime: 30 * 1000  // 30 segundos

// Datos en tiempo real (con subscription Supabase)
staleTime: 0  // siempre refetch, la subscription invalida la cache
```

### Paginación

Todas las tablas: 10 items por página. Implementar paginación client-side (los datasets son pequeños — < 1000 registros típicamente).

Si en el futuro el dataset crece, migrar a cursor-based pagination con `range()` de Supabase.

### Lazy Loading

Todas las páginas usan `React.lazy()` + `Suspense` (ya está configurado en routes/index.tsx).

---

## Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS en Supabase. Las queries siempre filtran por `user_id` implícitamente via RLS. Los services NO deben añadir `.eq('user_id', userId)` excepto en casos donde el RLS no lo cubra.

Excepción: si hay bugs de RLS o en tablas nuevas donde no se configuró, el service debe hacer el filter explícito hasta que se corrija en el backend.

### Validación de Input

- Formularios: Zod schemas en el frontend
- Services: confiar en el DB para constraints de integridad
- No duplicar validación entre frontend y backend salvo para UX (mostrar errores rápido)

### Datos sensibles

- No loggear datos de clientes en console.log (production)
- Los `internal_notes` de jobs son solo para el owner (backend los protege via RLS)

---

## Testing

No hay suites de test automatizadas en este proyecto. La verificación es:

1. **TypeScript:** `npx tsc --noEmit` debe pasar sin errores
2. **ESLint:** `npm run lint` debe pasar sin nuevos warnings/errors
3. **Manual:** probar el golden path de cada feature en el browser
4. **Regresión:** después de cada cambio mayor, verificar que las páginas adyacentes no se rompan

---

## Checklist Pre-Commit

Antes de cada commit que incluya los cambios de este spec:

- [ ] `npm run lint` pasa sin errores nuevos
- [ ] `npx tsc --noEmit` pasa con 0 errores
- [ ] Ningún archivo en `features/*/pages/` importa `supabase` directamente
- [ ] Ningún page hace `supabase.auth.getUser()` inline
- [ ] Todos los hooks usan `QK.*` para sus query keys
- [ ] Todos los service functions tienen JSDoc
- [ ] No hay `as any` nuevos (excepto los casos documentados)
- [ ] Las rutas nuevas están en `routes/index.tsx` con lazy loading
- [ ] El sidebar tiene las entradas nuevas con los íconos correctos
- [ ] `planFeatures.ts` está en sync (feature keys correctas)
- [ ] `queryKeys.ts` tiene las keys nuevas

---

## Compatibilidad con swift-slate

Este dashboard usa el mismo backend Supabase. Cualquier cambio de schema que requiera esta implementación debe:

1. Aplicarse en staging primero
2. Actualizarse en `src/integrations/supabase/types.ts` MANUALMENTE (no hay CLI gen)
3. No hacer cambios destructivos (no drop de columnas usadas por swift-slate)

**RPCs que se usan (deben existir en el backend):**
- `finalize_booking_conversion(p_booking_id, p_contact_type, p_contact_id, p_estimate_id?, p_walkthrough_id?)` — ya existe
- `finalize_estimate_to_job_conversion(p_estimate_id, p_job_id)` — ya existe
- `finalize_walkthrough_to_estimate_conversion(p_walkthrough_id, p_estimate_id)` — ya existe (walkthrough feature)

**Tabla `jobs`** — ya existe en Supabase (usada por swift-slate). El dashboard usa las mismas columnas.
