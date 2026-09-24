# Especificación — Parte 3B: Client Properties y ContactPicker

## Contexto

Cada cliente puede tener múltiples propiedades de servicio (direcciones donde se realiza el trabajo). Esta feature es prerequisito de Jobs: el formulario de Job necesita el `ContactPicker` (que incluye el `ServicePropertySelector`) para funcionar.

**Fuentes en swift-slate:**
- `src/types/clientProperty.ts` — tipos
- `src/services/clientPropertyService.ts` — CRUD completo
- `src/hooks/useClientProperties.ts` — todos los hooks
- `src/components/common/ServicePropertySelector.tsx` — selector embebido en ContactPicker
- `src/components/common/ContactPicker.tsx` — picker Client/Lead con property incluido
- `src/pages/ClientDetails.tsx` — gestión de properties desde el perfil del cliente

---

## Base de Datos

### Tablas (ya existen en Supabase)

**`client_properties`**
```sql
id              uuid PRIMARY KEY
user_id         uuid (FK profiles)
client_id       uuid (FK clients)
title           text NULL          -- nombre opcional de la propiedad (ej: "Casa Principal")
street          text NOT NULL
apt_suite       text NULL
city            text NOT NULL
state           text NOT NULL
zip_code        text NOT NULL
country         text NULL
is_primary      boolean DEFAULT false
is_active       boolean DEFAULT true
created_at      timestamptz
updated_at      timestamptz
```

**`client_property_contacts`** (contacto en sitio por propiedad, opcional)
```sql
id                  uuid PRIMARY KEY
user_id             uuid (FK profiles)
property_id         uuid (FK client_properties)
full_name           text NOT NULL
phone               text NULL
email               text NULL
role                text NULL          -- ej: "Building Manager", "Receptionist"
is_primary_contact  boolean DEFAULT false
created_at          timestamptz
updated_at          timestamptz
```

---

## Estructura de Archivos

```
src/features/crm/clients/
├── types/
│   └── clientProperty.types.ts         ← NUEVO
├── services/
│   ├── clientsService.ts               ← existente
│   └── clientPropertyService.ts        ← NUEVO
├── hooks/
│   ├── useClients.ts                   ← existente
│   └── useClientProperties.ts          ← NUEVO (todos los hooks de properties)
├── schemas/
│   └── clientPropertySchema.ts         ← NUEVO
└── components/
    ├── ClientForm.tsx                   ← existente
    ├── ClientDetailModal.tsx            ← existente — añadir sección Properties
    ├── ClientDetailPanel.tsx            ← existente — añadir sección Properties
    ├── PropertyForm.tsx                 ← NUEVO — modal crear/editar propiedad
    └── PropertyCard.tsx                 ← NUEVO — card de propiedad en el detail

src/shared/components/common/
├── ServicePropertySelector.tsx          ← NUEVO — selector de propiedad en forms
└── ContactPicker.tsx                    ← NUEVO — picker Client/Lead + property
```

---

## 1. Types (`clientProperty.types.ts`)

Copiar exactamente de `swift-slate/src/types/clientProperty.ts`:

```ts
export interface ClientPropertyContact {
  id: string;
  user_id: string;
  property_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPropertyContactFormData {
  full_name: string;
  phone: string;
  email: string;
  role: string;
  is_primary_contact: boolean;
}

export interface ClientProperty {
  id: string;
  user_id: string;
  client_id: string;
  title: string | null;
  street: string;
  apt_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client_property_contacts?: ClientPropertyContact[];
}

export interface ClientPropertyFormData {
  title: string;
  street: string;
  apt_suite: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_primary: boolean;
}
```

---

## 2. Service (`clientPropertyService.ts`)

Copiar de `swift-slate/src/services/clientPropertyService.ts`. Ajustes:
- Import supabase desde `@/integrations/supabase/client`
- Todas las llamadas usan `supabase as any` porque `client_properties` y `client_property_contacts` no están en los tipos locales generados
- Añadir JSDoc a cada función

```ts
export const clientPropertyService = {
  /** Fetches all active properties for a client, ordered primary first */
  async getByClientId(clientId: string): Promise<ClientProperty[]>

  /** Creates a new property. If is_primary, clears primary flag from others first. */
  async create(clientId: string, form: ClientPropertyFormData): Promise<ClientProperty>

  /** Updates a property. If is_primary, clears primary flag from others first. */
  async update(id: string, form: ClientPropertyFormData, clientId?: string): Promise<ClientProperty>

  /** Soft-deletes a property (sets is_active = false is optional; hard delete is acceptable) */
  async remove(id: string): Promise<void>

  /** Sets a property as the primary one for its client */
  async setPrimary(id: string): Promise<void>

  /** Creates a site contact for a property */
  async createContact(propertyId: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact>

  /** Updates a site contact */
  async updateContact(id: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact>

  /** Deletes a site contact */
  async deleteContact(id: string): Promise<void>
}
```

---

## 3. Query Keys

Añadir a `src/shared/config/queryKeys.ts`:

```ts
// Client Properties
clientProperties:  (clientId: string) => ["client-properties", clientId] as const,
```

---

## 4. Hooks (`useClientProperties.ts`)

Portarlo de `swift-slate/src/hooks/useClientProperties.ts`:

```ts
/** Fetch all properties for a client */
export function useClientProperties(clientId: string | undefined): UseQueryResult<ClientProperty[]>

/** Create a property */
export function useCreateClientProperty(clientId: string): UseMutationResult<...>

/** Update a property */
export function useUpdateClientProperty(clientId: string): UseMutationResult<...>

/** Delete a property */
export function useDeleteClientProperty(clientId: string): UseMutationResult<...>

/** Set a property as primary */
export function useSetPrimaryClientProperty(clientId: string): UseMutationResult<...>

/** Create a property contact */
export function useCreateClientPropertyContact(clientId: string): UseMutationResult<...>

/** Update a property contact */
export function useUpdateClientPropertyContact(clientId: string): UseMutationResult<...>

/** Delete a property contact */
export function useDeleteClientPropertyContact(clientId: string): UseMutationResult<...>
```

Todas las mutations invalidan `QK.clientProperties(clientId)` en `onSuccess`.

---

## 5. Schema Zod (`clientPropertySchema.ts`)

```ts
export const clientPropertySchema = z.object({
  title:    z.string().optional(),
  street:   z.string().min(1, 'Street is required'),
  apt_suite:z.string().optional(),
  city:     z.string().min(1, 'City is required'),
  state:    z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'ZIP code is required'),
  country:  z.string().optional(),
  is_primary: z.boolean().default(false),
});

export const propertyContactSchema = z.object({
  full_name:          z.string().min(1, 'Name is required'),
  phone:              z.string().optional(),
  email:              z.string().email().optional().or(z.literal('')),
  role:               z.string().optional(),
  is_primary_contact: z.boolean().default(false),
});
```

---

## 6. PropertyForm Component

**Archivo:** `features/crm/clients/components/PropertyForm.tsx`

Modal dialog (igual que `ClientForm`, `EmployeeForm`) para crear y editar propiedades.

```tsx
interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  property?: ClientProperty;  // undefined = create mode, defined = edit mode
}
```

**Campos:**
- Title (opcional) — ej: "Main Office", "Warehouse"
- Street (requerido)
- Apt/Suite (opcional)
- City (requerido)
- State (requerido)
- ZIP Code (requerido)
- Country (opcional, default "US")
- Is Primary (checkbox/toggle)

**Comportamiento:**
- Modo crear: `useCreateClientProperty(clientId).mutate(formData)`
- Modo editar: `useUpdateClientProperty(clientId).mutate({ id: property.id, form: formData })`
- Al guardar exitosamente: `onOpenChange(false)` + toast success

---

## 7. PropertyCard Component

**Archivo:** `features/crm/clients/components/PropertyCard.tsx`

Card que muestra una propiedad dentro del `ClientDetailPanel`/`ClientDetailModal`.

```
┌──────────────────────────────────────────────────┐
│  [★ Primary]  Casa Principal                      │
│  123 Main St, Apt 2B                              │
│  Los Angeles, CA 90001                            │
│                                                   │
│  Site Contact: John Smith (Building Manager)      │
│  📞 (555) 123-4567 · ✉ john@example.com          │
│                                                   │
│  [Set Primary]  [Edit]  [Delete]                  │
└──────────────────────────────────────────────────┘
```

Props:
```tsx
interface PropertyCardProps {
  property: ClientProperty;
  clientId: string;
  onEdit: (property: ClientProperty) => void;
}
```

Acciones:
- **Set Primary** (solo si `!property.is_primary`) → `useSetPrimaryClientProperty`
- **Edit** → `onEdit(property)` → abre `PropertyForm` en modo editar
- **Delete** → confirm dialog → `useDeleteClientProperty`

---

## 8. Integración en ClientDetailPanel / ClientDetailModal

En el panel/modal de detalle del cliente (archivos existentes), añadir una sección **"Properties"**:

```
┌── Properties ────────────────────────────────────────────────────┐
│  [+ Add Property]                                                 │
│                                                                   │
│  PropertyCard (property 1 — primary)                             │
│  PropertyCard (property 2)                                        │
│  PropertyCard (property 3)                                        │
└──────────────────────────────────────────────────────────────────┘
```

Lógica en el detail component:
```tsx
const { data: properties = [] } = useClientProperties(client.id);
const [propertyFormOpen, setPropertyFormOpen] = useState(false);
const [editingProperty, setEditingProperty] = useState<ClientProperty | undefined>();

// Render:
<PropertyForm
  open={propertyFormOpen}
  onOpenChange={setPropertyFormOpen}
  clientId={client.id}
  property={editingProperty}
/>
```

---

## 9. ServicePropertySelector (shared component)

**Archivo:** `src/shared/components/common/ServicePropertySelector.tsx`

Portarlo de `swift-slate/src/components/common/ServicePropertySelector.tsx`.

```tsx
interface ServicePropertySelectorProps {
  clientId: string | null | undefined;
  value: ClientProperty | null;
  onChange: (property: ClientProperty | null) => void;
  preferredPropertyId?: string | null;
}

export function ServicePropertySelector({
  clientId, value, onChange, preferredPropertyId
}: ServicePropertySelectorProps)
```

**Comportamiento:**
- Si `!clientId` o no hay propiedades → no renderiza nada (return null)
- Al montar o cambiar `clientId`: si no hay `value` seleccionado, auto-selecciona la primary (o la preferida si `preferredPropertyId` está set)
- Si el cliente cambia → llama `onChange(null)` para limpiar
- Muestra un `Select` (o `SearchableSelect` si existe en el proyecto) con todas las propiedades del cliente
- Debajo del select, muestra la dirección completa de la propiedad seleccionada

**UI:**
```
Service Property
Select the property where the service will be performed

[Select dropdown: "Casa Principal — 123 Main St"]

📍 Selected Address
   Casa Principal ★
   123 Main St
   Los Angeles, CA 90001
```

**Dependencia:** `useClientProperties(clientId)` — ya creado en el paso anterior.

---

## 10. ContactPicker (shared component)

**Archivo:** `src/shared/components/common/ContactPicker.tsx`

Portarlo de `swift-slate/src/components/common/ContactPicker.tsx`.

### Interface

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
  showPropertySelector?: boolean;   // default: true
  error?: boolean;
  preferredPropertyId?: string | null;
  clientIdFromUrl?: string | null;
  leadIdFromUrl?: string | null;
  onUrlParamConsumed?: () => void;
}
```

### Layout

```
┌── Contact Picker ────────────────────────────────────────────────┐
│  [👤 Client]  [💼 Lead]   ← toggle buttons                       │
│                                                                   │
│  [SearchableSelect: "Select client..."]                           │
│                                                                   │
│  ─── si es Client y showPropertySelector: ───────────────────    │
│  ServicePropertySelector                                           │
│    [Select property dropdown]                                     │
│    📍 Dirección seleccionada                                      │
│                                                                   │
│  ─── Card de info del contacto seleccionado: ────────────────    │
│  [Avatar] Nombre Cliente                                          │
│           email@ejemplo.com                                       │
│           (555) 123-4567                                          │
└──────────────────────────────────────────────────────────────────┘
```

### Comportamiento

- Toggle [Client] [Lead] cambia `contactType` y limpia el contacto seleccionado
- Al seleccionar un client → actualiza `value.client`, resetea `value.lead` y `value.property`
- Al seleccionar un lead → actualiza `value.lead`, resetea `value.client` y `value.property`
- `ServicePropertySelector` solo aparece cuando `contactType === 'client'` y `showPropertySelector === true`
- `clientIdFromUrl` / `leadIdFromUrl`: si se pasan, auto-seleccionan el contacto cuando la lista carga (usado en prefill desde otras entidades)

### Tipos auxiliares

`ClientListItem` y `LeadListItem` son los tipos que devuelven `useClients()` y `useLeads()` respectivamente. Verificar si ya existen exports de estos tipos en thunder_dashboard. Si no, exportarlos desde los hooks correspondientes.

---

## 11. Uso del ContactPicker en AddJobPage

```tsx
// En AddJobPage:
const [contact, setContact] = useState<ContactPickerValue>(EMPTY_CONTACT);

// En el JSX (sección Client/Lead):
<ContactPicker
  value={contact}
  onChange={setContact}
  showPropertySelector={true}
  preferredPropertyId={editingJob?.propertyId}
  error={!!errors.contact}
/>
```

El `contact.property` es la propiedad seleccionada que se guarda en el job como `property_street`, `property_city`, etc.

Cuando hay un job en edición, el `preferredPropertyId` se pasa para que el selector auto-seleccione la propiedad guardada en el job.

---

## Resumen de Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `features/crm/clients/types/clientProperty.types.ts` | Tipos ClientProperty, ClientPropertyFormData, etc. |
| `features/crm/clients/services/clientPropertyService.ts` | CRUD contra tabla `client_properties` |
| `features/crm/clients/hooks/useClientProperties.ts` | Todos los hooks (fetch + mutations) |
| `features/crm/clients/schemas/clientPropertySchema.ts` | Zod schemas |
| `features/crm/clients/components/PropertyForm.tsx` | Modal crear/editar propiedad |
| `features/crm/clients/components/PropertyCard.tsx` | Card de propiedad en el detail |
| `shared/components/common/ServicePropertySelector.tsx` | Selector de propiedad (para forms) |
| `shared/components/common/ContactPicker.tsx` | Picker Client/Lead con property embebida |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `features/crm/clients/components/ClientDetailPanel.tsx` | Añadir sección Properties con `PropertyCard` list y botón "Add Property" |
| `features/crm/clients/components/ClientDetailModal.tsx` | Ídem |
| `shared/config/queryKeys.ts` | Añadir `QK.clientProperties(clientId)` |
