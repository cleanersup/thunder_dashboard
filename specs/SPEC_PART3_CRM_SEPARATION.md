# Especificación — Parte 3: Separar CRM en Clients / Leads / Tasks

## Objetivo

Convertir la página unificada `/crm` (con tabs Leads | Clients | Tasks) en 3 páginas independientes con rutas y entradas de sidebar propias. Cada una debe seguir el patrón de página estándar del proyecto.

---

## Estado Actual

**Archivo principal:** `src/features/crm/pages/CRMPage.tsx`

Estructura actual:
```
/crm
  Tabs: [Leads] [Clients] [Tasks]
  Cada tab renderiza:
    - LeadsKanban
    - ClientsTable
    - TasksTable
```

**Componentes existentes (reutilizar sin modificar):**
- `features/crm/clients/components/ClientsTable.tsx`
- `features/crm/clients/components/ClientForm.tsx`
- `features/crm/clients/components/ClientDetailModal.tsx`
- `features/crm/clients/components/ClientDetailPanel.tsx`
- `features/crm/leads/components/LeadsKanban.tsx`
- `features/crm/leads/components/LeadForm.tsx`
- `features/crm/leads/components/LeadDetailModal.tsx`
- `features/crm/tasks/components/TasksTable.tsx`
- `features/crm/tasks/components/TaskForm.tsx`
- `features/crm/tasks/components/TaskDetailModal.tsx`

---

## Nuevas Páginas

### 3.1 LeadsPage

**Ruta:** `/leads`
**Archivo:** `features/crm/leads/pages/LeadsPage.tsx`

```
div.p-2.5.space-y-2.5
  ┌── Card KPI ──────────────────────────────────────────────────────┐
  │  grid grid-cols-2 lg:grid-cols-4                                  │
  │  [Total Leads] [Active Leads] [Hot Leads] [Converted Leads]       │
  └───────────────────────────────────────────────────────────────────┘
  ┌── Card Toolbar ──────────────────────────────────────────────────┐
  │  Left: status filter tabs (All | Active | Won | Lost | Archive)  │
  │  Right: [Search] [+ Add Lead]                                    │
  └───────────────────────────────────────────────────────────────────┘
  ┌── LeadsKanban / LeadsList ───────────────────────────────────────┐
  │  Toggle: Kanban view | Table view (opcional, ver UX)              │
  └───────────────────────────────────────────────────────────────────┘
```

**KPIs:**
| Card | Valor | Color |
|------|-------|-------|
| Total Leads | `leads.length` | `hsl(var(--info))` |
| Active Leads | `leads.filter(l => l.status === 'active').length` | `hsl(var(--success))` |
| Hot Leads | `leads.filter(l => l.priority === 'high').length` | `hsl(var(--warning))` |
| Converted | `leads.filter(l => l.status === 'won').length` | `hsl(var(--purple-vibrant))` |

**Estado del search/filter:**
- Search por nombre, email, phone
- Filter por status: all / active / won / lost / archived

**Sidebar entry:**
```ts
{ path: "/leads", icon: TrendingUp, label: "Leads", feature: "crm" }
```

---

### 3.2 ClientsPage

**Ruta:** `/clients`
**Archivo:** `features/crm/clients/pages/ClientsPage.tsx`

```
div.p-2.5.space-y-2.5
  ┌── Card KPI ──────────────────────────────────────────────────────┐
  │  grid grid-cols-2 lg:grid-cols-4                                  │
  │  [Total Clients] [Active Clients] [Inactive Clients] [Properties] │
  └───────────────────────────────────────────────────────────────────┘
  ┌── Card Toolbar ──────────────────────────────────────────────────┐
  │  Left: status filter (All | Active | Inactive)                   │
  │  Right: [Search] [+ Add Client]                                  │
  └───────────────────────────────────────────────────────────────────┘
  ┌── ClientsTable ──────────────────────────────────────────────────┐
  │  (componente existente, solo envolver en la nueva página)         │
  └───────────────────────────────────────────────────────────────────┘
```

**KPIs:**
| Card | Valor | Color |
|------|-------|-------|
| Total Clients | `clients.length` | `hsl(var(--primary))` |
| Active Clients | `clients.filter(c => c.status === 'active').length` | `hsl(var(--success))` |
| Inactive | `clients.filter(c => c.status === 'inactive').length` | `hsl(var(--muted-foreground))` |
| Properties | suma de properties totales (de `useCRMStats`) | `hsl(var(--blue-vibrant))` |

**Sidebar entry:**
```ts
{ path: "/clients", icon: Users, label: "Clients", feature: "crm" }
```

---

### 3.3 TasksPage

**Ruta:** `/tasks`
**Archivo:** `features/tasks/pages/TasksPage.tsx`

```
div.p-2.5.space-y-2.5
  ┌── Card KPI ──────────────────────────────────────────────────────┐
  │  grid grid-cols-2 lg:grid-cols-4                                  │
  │  [Total Tasks] [Pending] [In Progress] [Completed]                │
  └───────────────────────────────────────────────────────────────────┘
  ┌── Card Toolbar ──────────────────────────────────────────────────┐
  │  Left: status filter (All | Pending | In Progress | Completed)   │
  │  Right: [Search] [+ Add Task]                                    │
  └───────────────────────────────────────────────────────────────────┘
  ┌── TasksTable ───────────────────────────────────────────────────┐
  │  (componente existente, solo envolver en la nueva página)         │
  └───────────────────────────────────────────────────────────────────┘
```

**KPIs:**
| Card | Valor | Color |
|------|-------|-------|
| Total Tasks | `tasks.length` | `hsl(var(--primary))` |
| Pending | `tasks.filter(t => t.status === 'pending').length` | `hsl(var(--warning))` |
| In Progress | `tasks.filter(t => t.status === 'in_progress').length` | `hsl(var(--info))` |
| Completed | `tasks.filter(t => t.status === 'completed').length` | `hsl(var(--success))` |

**Sidebar entry:**
```ts
{ path: "/tasks", icon: CheckSquare, label: "Tasks", feature: "crm" }
```

---

## Cambios al Sidebar

### Orden recomendado de entradas

```ts
const NAV_ITEMS = [
  { path: "/home",         icon: Home,         label: "Home" },

  // ── CRM ────────────────────────────────────────────────────────
  { path: "/leads",        icon: TrendingUp,   label: "Leads",      feature: "crm" },
  { path: "/clients",      icon: Users,        label: "Clients",    feature: "crm" },
  { path: "/tasks",        icon: CheckSquare,  label: "Tasks",      feature: "crm" },

  // ── Workflow ────────────────────────────────────────────────────
  { path: "/requests",     icon: CalendarClock,label: "Requests",   feature: "requests" },
  { path: "/walkthroughs", icon: ClipboardList,label: "Walkthroughs",feature: "walkthrough" },
  { path: "/estimates",    icon: Receipt,      label: "Estimates",  feature: "estimates" },
  { path: "/jobs",         icon: Briefcase,    label: "Jobs",       feature: "jobs" },
  { path: "/invoices",     icon: FileText,     label: "Invoices",   feature: "invoices" },
  { path: "/contracts",    icon: FileSignature,label: "Contracts",  feature: "contracts" },

  // ── Ops ─────────────────────────────────────────────────────────
  { path: "/create-route", icon: Route,        label: "Route",      feature: "routes" },
  { path: "/employees",    icon: UserPlus,     label: "Employees",  feature: "employee" },
  { path: "/time-clock",   icon: Clock,        label: "Time Clock", feature: "time_clock" },
  { path: "/smart-map",    icon: MapPin,       label: "Smart Map",  feature: "smart_map" },

  // ── Settings ────────────────────────────────────────────────────
  { path: "/profile",      icon: Settings,     label: "Settings" },
];
```

Los divisores (`DIVIDER_AFTER`) deben actualizarse:
- Después de `/tasks` (fin de sección CRM)
- Después de `/contracts` (fin de sección Workflow)
- Después de `/smart-map` (fin de sección Ops)

### isActive logic

El sidebar actual usa `location.pathname.startsWith(path)`. Para las nuevas rutas esto es correcto sin cambios.

---

## Cambios a Rutas (`src/app/routes/index.tsx`)

### Imports a añadir

```tsx
const LeadsPage    = lazy(() => import("@/features/crm/leads/pages/LeadsPage").then(m => ({ default: m.LeadsPage })));
const ClientsPage  = lazy(() => import("@/features/crm/clients/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const TasksPage    = lazy(() => import("@/features/tasks/pages/TasksPage").then(m => ({ default: m.TasksPage })));
```

### Nuevas rutas

```tsx
// Reemplazar la ruta /crm:
<Route path="/crm" element={<Navigate to="/leads" replace />} />

// Añadir:
<Route path="/leads"   element={<ProtectedRoute requireFeature="crm"><LeadsPage /></ProtectedRoute>} />
<Route path="/clients" element={<ProtectedRoute requireFeature="crm"><ClientsPage /></ProtectedRoute>} />
<Route path="/tasks"   element={<ProtectedRoute requireFeature="crm"><TasksPage /></ProtectedRoute>} />
```

---

## Qué hacer con CRMPage

`features/crm/pages/CRMPage.tsx` puede:
1. Eliminarse completamente (recomendado — ya no tiene uso)
2. Mantenerse como un redirect shell a `/leads`

Recomendación: eliminar el archivo, actualizar las rutas.

---

## Hook useCRMStats

El hook `useCRMStats.ts` existe en `features/crm/hooks/`. Actualmente devuelve `{ stats: { totalLeads, allClients, activeClients, totalTasks } }`. 

Ampliar para devolver también:
```ts
interface CRMStats {
  totalLeads: number;
  activeLeads: number;
  hotLeads: number;
  convertedLeads: number;
  allClients: number;
  activeClients: number;
  inactiveClients: number;
  totalProperties: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
}
```

Cada nueva página usa `useCRMStats()` para los KPIs. Los hooks de lista (`useLeads`, `useClients`, `useTasks`) ya están implementados — las páginas los llaman directamente para los datos de la tabla.

---

## Navegación Interna

### Desde otros módulos hacia CRM

Actualizar referencias a `/crm` en el codebase:
```bash
grep -rn '"/crm"' src/ --include="*.tsx" --include="*.ts"
```
Reemplazar con la ruta específica según el contexto:
- Links a clientes → `/clients`
- Links a leads → `/leads`
- Links a tasks → `/tasks`

### ClientDetailPanel / LeadDetailPanel

Estos panels tienen botones de acción. No cambian funcionalmente, pero verificar que los `navigate()` apunten a las rutas nuevas.

### Dashboard

Si `DashboardPage` tiene links a `/crm`, actualizarlos a `/leads`, `/clients` o `/tasks` según el contexto del widget.
