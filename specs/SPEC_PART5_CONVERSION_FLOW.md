# Especificación — Parte 5: Flujo de Conversión Completo

## El Pipeline

```
PUBLIC FORM ──→ REQUEST ──→ WALKTHROUGH ──→ ESTIMATE ──→ JOB
                        ↘                           ↗
                          ──→ ESTIMATE ─────────────
```

Cada flecha es una "conversión" que:
1. Crea la nueva entidad con datos pre-llenados de la anterior
2. Actualiza el status/campo de la entidad origen a "converted"
3. Guarda la referencia cruzada entre ambas entidades (para poder navegar de vuelta)

---

## Conversiones Implementadas vs Pendientes

| Conversión | Estado en thunder_dashboard | Archivo fuente en swift-slate |
|-----------|---------------------------|-------------------------------|
| Request → Estimate | ❌ Falta `ConvertRequestDialog` | `components/requests/ConvertRequestDialog.tsx` |
| Request → Walkthrough | ❌ Falta `ConvertRequestDialog` | mismo archivo |
| Walkthrough → Estimate | ✅ Ya existe | `walkthroughToEstimatePrefill.ts` |
| Estimate → Job | ❌ Falta `useConvertEstimateToJob` | `hooks/useConvertEstimateToJob.ts` |

---

## 5.1 Request → Estimate / Walkthrough

### Componente: `ConvertRequestDialog`

**Ubicación:** `features/requests/components/ConvertRequestDialog.tsx`

**Fuente:** `swift-slate/src/components/requests/ConvertRequestDialog.tsx`

**Cuándo se abre:** Desde `RequestDetailPanel` / `RequestDetailModal`, botón "Convert Request".

### UI del Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Convert Request                                                  │
│  Choose how to proceed with this request                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📋 Estimate                                                │ │
│  │  Create a detailed estimate for this service                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📝 Walkthrough                                             │ │
│  │  Schedule an on-site inspection first                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Cada opción es un botón card que al hacer click ejecuta la conversión.

### Flujo: Convert → Estimate

```ts
// 1. Resolver el contacto (lead o client) del request
const contact = await requestsService.resolveContact(request);
// → request.lead_id o request.client_id si ya existen
// → si no, buscar por email/teléfono en clients y leads
// → si no existe → crear lead automáticamente

// 2. Construir el prefill de datos para el estimate form
const estimatePrefill: DraftData = {
  clientId: contact.type === 'client' ? contact.id : undefined,
  leadId:   contact.type === 'lead'   ? contact.id : undefined,
  clientName: request.lead_name,
  email: request.email,
  phone: request.phone,
  address: request.street,
  apt: request.apt_suite,
  city: request.city,
  state: request.state,
  zip: request.zip_code,
  // campos específicos según service_type:
  // residential → bedrooms, bathrooms, additional_services
  // commercial → commercial_property_type, service_details
  ...mapRequestFieldsToEstimateForm(request),
};

// 3. Llamar RPC para marcar el request como converted y guardar referencia
await supabase.rpc('finalize_booking_conversion', {
  p_booking_id: request.id,
  p_contact_type: contact.type,
  p_contact_id: contact.id,
  p_estimate_id: null,   // se setea en el RPC interno
});
// IMPORTANTE: swift-slate llama este RPC DESPUÉS del INSERT del estimate
// El RPC recibe el estimate.id y actualiza el booking

// 4. Navegar al formulario de estimates con prefill en state
const serviceType = request.service_type === 'commercial' ? 'commercial' : 'residential';
navigate(`/estimates/new/${serviceType}`, {
  state: {
    prefill: estimatePrefill,
    fromRequestId: request.id,
  }
});
```

**Importante — el flujo real en swift-slate:**

1. El dialog NO llama el RPC antes de navegar
2. El RPC `finalize_booking_conversion` se llama DESDE CreateResidentialEstimatePage / CreateCommercialEstimatePage en el `onSuccess` del INSERT del estimate
3. El navigate lleva `{ state: { prefill, fromRequestId } }`
4. El estimate page lee `location.state.prefill` en un `useEffect([])` y pre-popula el formulario
5. Cuando el estimate se guarda, llama al RPC con `{ p_booking_id: fromRequestId, p_estimate_id: newEstimate.id }`

Este flujo ya existe en swift-slate. Verificar si thunder_dashboard ya lo tiene o no.

### Flujo: Convert → Walkthrough

```ts
// 1. Resolver contacto (mismo que arriba)
const contact = await requestsService.resolveContact(request);

// 2. Construir prefill para walkthrough
const walkthroughPrefill = {
  contactId: contact.id,
  contactType: contact.type,
  address: `${request.street}, ${request.city}, ${request.state} ${request.zip_code}`,
  serviceType: request.service_type,
  preferredDate: request.preferred_date,
  timePreference: request.time_preference,
  fromRequestId: request.id,
};

// 3. El RPC finalize_booking_conversion se llama desde AddWalkthroughPage
// en el onSuccess del CREATE walkthrough, pasando:
// { p_booking_id: fromRequestId, p_walkthrough_id: newWalkthrough.id }

// 4. Navegar
navigate('/walkthroughs/new', {
  state: { prefill: walkthroughPrefill }
});
```

### Lógica de `resolveContact` (en requestsService)

```ts
/**
 * Resolves the best contact match for a booking request.
 * Priority: explicit client_id/lead_id → email match → name+phone match → create lead
 */
async resolveOrCreateContact(request: BookingRequest, userId: string): Promise<ContactMatch>
```

Portado de `swift-slate/src/services/requestService.ts` → función `resolveOrCreateContact`.

---

## 5.2 AddWalkthroughPage — recibir prefill de Request

`features/walkthroughs/pages/AddWalkthroughPage.tsx` ya existe. Añadir soporte para `location.state.prefill`:

```ts
// En AddWalkthroughPage, useEffect([]) al montar:
const prefill = (location.state as any)?.prefill;
const fromRequestId = prefill?.fromRequestId;

if (prefill) {
  // pre-poblar formulario con datos del request
  setValue('contactId', prefill.contactId);
  setValue('contactType', prefill.contactType);
  setValue('address', prefill.address);
  setValue('serviceType', prefill.serviceType);
  setValue('preferredDate', prefill.preferredDate);
}
```

**Llamar RPC al crear el walkthrough (en `onSuccess` de la mutación):**
```ts
if (fromRequestId && newWalkthrough.id) {
  await supabase.rpc('finalize_booking_conversion', {
    p_booking_id: fromRequestId,
    p_walkthrough_id: newWalkthrough.id,
    p_contact_type: contact.type,
    p_contact_id: contact.id,
  });
  queryClient.invalidateQueries({ queryKey: QK.requests });
  queryClient.invalidateQueries({ queryKey: QK.request(fromRequestId) });
}
```

---

## 5.3 CreateEstimatePage — recibir prefill de Request y Walkthrough

Los pages `CreateResidentialEstimatePage` y `CreateCommercialEstimatePage` ya existen y ya leen `location.state.prefill` para walkthrough. Extender para también recibir `fromRequestId`:

```ts
const fromRequestId = (location.state as any)?.fromRequestId;

// En onSuccess del INSERT del estimate:
if (fromRequestId) {
  await supabase.rpc('finalize_booking_conversion', {
    p_booking_id: fromRequestId,
    p_estimate_id: newEstimate.id,
    p_contact_type: contactType,
    p_contact_id: contactId,
  });
  queryClient.invalidateQueries({ queryKey: QK.requests });
  queryClient.invalidateQueries({ queryKey: QK.request(fromRequestId) });
}
```

---

## 5.4 Estimate → Job (`useConvertEstimateToJob`)

**Ubicación:** `features/jobs/hooks/useConvertEstimateToJob.ts`

**Fuente:** `swift-slate/src/hooks/useConvertEstimateToJob.ts`

### Cuándo se usa

Desde `EstimateDetailPanel` o desde la página de detalle del estimate, botón "Convert to Job".

### Interfaz

```ts
interface ConvertEstimateToJobOptions {
  estimate: FormattedEstimate;
  serviceLabel?: string;   // nombre del line item en el job
  onStart: () => void;     // setIsLoading(true)
  onFinally: () => void;   // setIsLoading(false)
  onSuccess?: () => void;
}

export function useConvertEstimateToJob(): (opts: ConvertEstimateToJobOptions) => Promise<void>
```

### Flujo Detallado

```ts
// 1. Obtener user_id (via service, no inline)
const userId = await jobsService.getCurrentUserId();

// 2. Si el estimate tiene propertyId, obtener la dirección real de la propiedad
let propertyAddress = { street, apt, city, state, zip } = fromEstimate;
if (additionalData.propertyId) {
  const property = await clientsService.fetchProperty(additionalData.propertyId);
  if (property) propertyAddress = mapProperty(property);
}

// 3. Calcular pricing (portado de swift-slate, misma lógica)
const subtotal = estimate.subtotal;
const discountType = normalizeDiscountType(estimate.discount_type); // 'percent' | 'amount'
const discountAmount = computeDiscountAmount(subtotal, discountType, estimate.discount_value);
const total = resolveEstimateDisplayTotal(estimate);
const depositRequired = additionalData.deposit_required || false;
const depositAmount = calculateDepositAmount(total, depositType, depositValue);

// 4. INSERT en jobs
const newJob = await supabase.from('jobs').insert({
  user_id: userId,
  client_id: estimate.client_id || null,
  lead_id: estimate.lead_id || null,
  contact_type: estimate.client_id ? 'client' : 'lead',
  client_name: estimate.client_name,
  service_type: estimate.service_type?.toLowerCase(),
  job_type: 'one_time',
  scheduled_date: estimate.estimate_date?.slice(0, 10) || today,
  line_items: [{
    name: serviceLabel || estimate.service_sub_type || 'Cleaning Service',
    quantity: 1,
    unit_price: subtotal,
    description: estimate.service_scope || '',
  }],
  subtotal, discount_type, discount_value, discount_amount,
  total_amount: total,
  deposit_required: depositRequired,
  deposit_type: depositType, deposit_value: depositValue, deposit_amount: depositAmount,
  balance_due: total - depositAmount,
  payment_status: depositRequired ? 'pending_deposit' : 'no_deposit_required',
  amount_paid: 0,
  status: 'draft',
  estimate_id: estimate.id,
  // property fields
  property_street, property_apt, property_city, property_state, property_zip,
  assigned_employees: [],
  selected_week_days: [],
}).select('id').single();

// 5. RPC para marcar el estimate como convertido
await supabase.rpc('finalize_estimate_to_job_conversion', {
  p_estimate_id: estimate.id,
  p_job_id: newJob.id,
});
// Si falla → DELETE newJob (rollback)

// 6. Invalidar queries
queryClient.invalidateQueries({ queryKey: QK.jobs });
queryClient.invalidateQueries({ queryKey: QK.estimates });

// 7. Navegar a edición del job para completar datos (fecha, empleados)
navigate(`/jobs/${newJob.id}/edit`, {
  state: { fromEstimateId: estimate.id }
});
```

### Botón "Convert to Job" en EstimateDetailPanel

En `features/estimates/components/EstimateDetailPanel.tsx`, añadir:

```tsx
{/* Solo mostrar si estimate.status === 'accepted' y no tiene job linked */}
{estimate.status === 'accepted' && !estimate.job_id && (
  <ConvertToJobButton
    estimate={estimate}
    onStart={() => setIsConverting(true)}
    onFinally={() => setIsConverting(false)}
  />
)}
```

**Alternativa**: mostrar el botón también en status `sent` (si el negocio cierra el deal verbalmente).

### `ConvertToJobButton` component

```tsx
// features/jobs/components/ConvertToJobButton.tsx
interface ConvertToJobButtonProps {
  estimate: FormattedEstimate;
  onStart?: () => void;
  onFinally?: () => void;
}

export function ConvertToJobButton({ estimate, onStart, onFinally }: ConvertToJobButtonProps) {
  const convert = useConvertEstimateToJob();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      onClick={() => convert({
        estimate,
        onStart: () => { setIsLoading(true); onStart?.(); },
        onFinally: () => { setIsLoading(false); onFinally?.(); },
      })}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : <Briefcase />}
      Convert to Job
    </Button>
  );
}
```

---

## 5.5 Rastreo de Conversiones en el Detail View

### RequestDetailPanel — mostrar entidad convertida

Cuando `request.status === 'converted'`, mostrar un card con el link a la entidad creada:

```tsx
{request.status === 'converted' && (
  <Card>
    <CardContent>
      <p className="text-sm font-semibold mb-2">Converted To</p>
      {request.converted_to_type === 'estimate' && (
        <Link to={`/estimates?id=${request.converted_to_id}`}>
          <Receipt className="text-blue-500" />
          View Estimate
        </Link>
      )}
      {request.converted_to_type === 'walkthrough' && (
        <Link to={`/walkthroughs?id=${request.converted_to_id}`}>
          <ClipboardList className="text-green-500" />
          View Walkthrough
        </Link>
      )}
    </CardContent>
  </Card>
)}
```

Datos de `request.converted_to_type` y `request.converted_to_id` vienen de la tabla `bookings`.

### EstimateDetailPanel — mostrar job creado (si existe)

Si `estimate.converted_to_job_id` (campo en la tabla estimates, seteado por el RPC):

```tsx
{estimate.converted_to_job_id && (
  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
    <Link to={`/jobs/${estimate.converted_to_job_id}`}>
      <Briefcase className="text-green-600" />
      View Job created from this estimate
    </Link>
  </div>
)}
```

### Hook para obtener entidad linkeada al request

```ts
// En requestsService
async getLinkedConversionRecord(requestId: string): Promise<{
  type: 'estimate' | 'walkthrough';
  id: string;
  path: string;
} | null>
```

Portado de `swift-slate/src/utils/requestConversion.ts` → `getLinkedConversionRecord`.

---

## 5.6 Resumen del Flujo Completo UI

### Escenario A: Request → Estimate → Job

1. Cliente llena el public form `/booking/:userId`
2. Owner ve el request en `/requests` → status "new"
3. Owner abre el request → detail panel
4. Owner hace click en "Convert Request" → `ConvertRequestDialog`
5. Owner elige "Estimate" → navegación a `/estimates/new/residential` con prefill
6. Owner completa el estimate form → guarda → navigate a `/estimates`
7. El RPC marca el request como "converted" con `converted_to_type='estimate'`
8. El detail del estimate muestra botón "Convert to Job" (cuando status = accepted)
9. Owner hace click → `useConvertEstimateToJob` → INSERT en jobs → RPC
10. Navega a `/jobs/:id/edit` para completar fecha/empleados
11. Owner activa el job → status "Upcoming"

### Escenario B: Request → Walkthrough → Estimate → Job

1-4. Igual que escenario A
5. Owner elige "Walkthrough" → navegación a `/walkthroughs/new` con prefill
6. Owner programa el walkthrough → guarda → RPC marca request como "converted"
7. Owner realiza el walkthrough → status "Completed"
8. Owner hace click en "Convert to Estimate" en el walkthrough detail
9. Navega a `/estimates/new/residential` con prefill del walkthrough
10. Owner completa estimate → resto igual que escenario A

### Escenario C: Job directo (sin conversión)

1. Owner va a `/jobs/new`
2. Llena el formulario directamente
3. Guarda como Draft o activa directamente como Upcoming
