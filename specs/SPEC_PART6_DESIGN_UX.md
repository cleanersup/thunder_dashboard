# Especificación — Parte 6: Diseño y UX

## Principios de Diseño

1. **Consistencia total con el sistema existente** — no inventar nuevos patrones. Copiar exactamente el patrón establecido en features ya implementadas (Employees, Walkthroughs, Invoices).
2. **Desktop-first con mobile responsivo** — sidebar colapsable en desktop, Sheet drawer en mobile.
3. **Texto exacto de swift-slate** — cualquier label, título o descripción debe coincidir con el texto de la app móvil.
4. **Acciones contextuales** — las acciones disponibles dependen del status de la entidad.

---

## Patrón de Página Estándar

Establecido en F15. Todas las páginas de lista usan este layout sin excepción:

```tsx
<div className="p-2.5 space-y-2.5">
  {/* 1. KPI Card */}
  <Card className="border border-border/50 shadow-none">
    <CardContent className="p-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.title} className="border-l-4 pl-4" style={{ borderLeftColor: kpi.color }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/50">
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>

  {/* 2. Toolbar Card */}
  <Card className="border border-border/50 shadow-none">
    <CardContent className="p-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: tabs/filters */}
        <div className="flex items-center gap-2">
          {/* filter options */}
        </div>
        {/* Right: search + primary action */}
        <div className="flex items-center gap-2">
          <Input placeholder="Search..." className="w-64" />
          <Button><Plus /> Add X</Button>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* 3. Data Card */}
  <Card className="border border-border/50 shadow-none">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-bold">Column Name</TableHead>
          ...
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={N}>
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={N}>
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Icon className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No items found</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          data.map(item => <TableRow key={item.id}>...</TableRow>)
        )}
      </TableBody>
    </Table>
    {/* Pagination */}
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  </Card>
</div>
```

---

## Patrón de Detail Panel (Split View)

Para páginas que muestran un panel de detalle lateral al seleccionar una fila:

```tsx
// Patrón: la página tiene un estado selectedItem
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

// Layout:
<div className="p-2.5 space-y-2.5">
  {/* KPI + Toolbar + Tabla — igual que siempre */}
  {/* Al hacer click en fila → setSelectedItem(row) */}
</div>

{/* Panel lateral */}
{selectedItem && (
  <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
    <SheetContent side="right" className="w-[480px] p-0">
      <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
    </SheetContent>
  </Sheet>
)}
```

En desktop (≥1024px) puede mostrarse como panel lateral fijo al lado de la tabla, en vez de Sheet drawer. Depende del feature; Jobs puede usar Sheet como el resto.

---

## JobsPage — Diseño Específico

### Tabla de Jobs (columnas)

| Col | Contenido | Width |
|-----|-----------|-------|
| Job # | badge de status + número (ej: `J-0005`) | 120px |
| Client | nombre del cliente/lead | auto |
| Date | fecha formateada (ej: "Mon, Jun 15") | 140px |
| Service | "Residential" o "Commercial" + frecuencia | 160px |
| Total | `$X,XXX.XX` | 100px |
| Status | `JobStatusBadge` | 120px |
| Actions | DropdownMenu | 60px |

### JobStatusBadge component

```tsx
// features/jobs/components/JobStatusBadge.tsx
interface JobStatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export function JobStatusBadge({ status, size = 'md' }: JobStatusBadgeProps) {
  return (
    <Badge
      className={cn(JOB_STATUS_BADGE[status], size === 'sm' ? 'text-xs px-1.5 py-0.5' : '')}
    >
      {JOB_STATUS_ICON[status]}
      {status}
    </Badge>
  );
}
```

### Row actions (DropdownMenu)

```
View Details    → navigate(`/jobs/${job.id}`)
Edit            → navigate(`/jobs/${job.id}/edit`)  [solo Draft/Upcoming/Today]
Mark Completed  → confirm dialog  [solo Upcoming/Today/Missed]
Cancel          → confirm dialog  [solo Draft/Upcoming/Today/Scheduled]
Delete          → confirm dialog  [solo Draft o Cancelled]
```

### Colores de status (para badges, KPIs, etc.)

Usar exactamente los valores de `jobStatusConfig.tsx`:

```ts
Draft:     amber (bg-amber-50 text-amber-700 border-amber-200)
Scheduled: blue  (bg-blue-50 text-blue-700 border-blue-200)
Upcoming:  sky   (bg-sky-50 text-sky-700 border-sky-200)
Today:     green (bg-green-50 text-green-700 border-green-200)
Ongoing:   blue  (mismo que Scheduled)
Completed: teal  (bg-teal-50 text-teal-700 border-teal-200)
Missed:    red   (bg-red-50 text-red-700 border-red-200)
Cancelled: gray  (bg-gray-50 text-gray-600 border-gray-200)
```

---

## AddJobPage — Diseño Específico

### Layout Desktop (2 columnas en lg)

```
┌── Sticky Header ────────────────────────────────────────────────┐
│  [← Jobs]    New Job / Edit Job              [Save Draft] [Save] │
└─────────────────────────────────────────────────────────────────┘
┌── Content grid-cols-1 lg:grid-cols-2 ──────────────────────────┐
│  LEFT COLUMN:                    RIGHT COLUMN:                   │
│  ┌── Client / Lead ─────────┐   ┌── Services ────────────────┐  │
│  │  [Client] [Lead] toggle  │   │  Line items list           │  │
│  │  ContactPicker           │   │  + Add new item            │  │
│  │  Property selector       │   └────────────────────────────┘  │
│  └──────────────────────────┘                                    │
│  ┌── Employees ─────────────┐   ┌── Pricing ────────────────┐   │
│  │  Multi-select            │   │  Subtotal                  │   │
│  └──────────────────────────┘   │  Discount                  │   │
│  ┌── Job Type ──────────────┐   │  Tax                       │   │
│  │  [Residential][Commercial]│  │  Total                     │   │
│  │  [One-Time][Recurring]   │   └────────────────────────────┘  │
│  │  Freq/Duration (si rec.) │   ┌── Deposit ─────────────────┐  │
│  └──────────────────────────┘   │  Toggle + amount            │  │
│  ┌── Schedule ─────────────┐    └────────────────────────────┘  │
│  │  Job Date               │    ┌── Notes ───────────────────┐  │
│  │  Start Time / End Time  │    │  Service Details            │  │
│  └──────────────────────────┘   │  Internal Notes             │  │
│                                  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
┌── Footer ───────────────────────────────────────────────────────┐
│  [Save as Draft]                              [Schedule Job]     │
└─────────────────────────────────────────────────────────────────┘
```

En mobile (< lg): stack vertical (single column), igual que swift-slate.

### Toggle Buttons (patrón reutilizable)

Para los toggles [Residential/Commercial], [One-Time/Recurring], [Client/Lead]:

```tsx
// Patrón visual ya establecido en swift-slate
<div className="flex border border-border rounded-md overflow-hidden">
  <button
    className={cn(
      "flex-1 py-2 text-sm font-medium transition-colors",
      isSelected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
    )}
    onClick={() => setValue(option)}
  >
    {label}
  </button>
</div>
```

---

## JobDetailPage — Diseño Específico

### Header con acciones contextuales

```
┌──────────────────────────────────────────────────────────────────┐
│ [← Back]    Job Details                   [⊕ Actions dropdown]   │
├──────────────────────────────────────────────────────────────────┤
│  JobStatusBadge  [Status-specific action button(s)]              │
└──────────────────────────────────────────────────────────────────┘
```

**Botones de acción por status:**

| Status | Botones visibles |
|--------|-----------------|
| Draft | [Edit] [Activate] |
| Upcoming | [Edit] [Mark as Completed ✓] |
| Today | [Edit] [Mark as Completed ✓] |
| Missed | [Mark as Completed ✓] [Reschedule] |
| Completed | [Download PDF] [View Invoice] |
| Cancelled | [Delete] |

### Sección de Invoices (solo en Completed)

```
┌── Invoices ────────────────────────────────────────────────────┐
│  Deposit Invoice                                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  INV-2026-001  ·  $150.00  ·  [Paid badge]                │ │
│  │  [View Invoice]                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│  Final Invoice                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  INV-2026-002  ·  $250.00  ·  [Pending badge]             │ │
│  │  [Send Invoice]  [View Invoice]                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## ConvertRequestDialog — Diseño

```
┌────────────────────────────────────────────────────────────────┐
│  Convert Request                                [×]             │
│  Choose how to proceed with this service request                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Receipt icon, blue]  Estimate                          │   │
│  │  Create a detailed price estimate for the client         │   │
│  │  → Skip the walkthrough and go straight to pricing       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [ClipboardList icon, green]  Walkthrough                │   │
│  │  Schedule an on-site visit before creating an estimate   │   │
│  │  → Useful for complex or large projects                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          [Cancel]                               │
└────────────────────────────────────────────────────────────────┘
```

Cada card es un botón interactivo (hover con border + background tint). Un spinner aparece sobre la card seleccionada mientras carga.

---

## Sidebar — Diseño Revisado

### Agrupación visual con divisores

```
Home                           [🏠]

── CRM ──────────────────────
Leads                          [📈]
Clients                        [👥]
Tasks                          [✓]

── Workflow ─────────────────
Requests                       [📅]
Walkthroughs                   [📋]
Estimates                      [🧾]
Jobs                           [💼]
Invoices                       [📄]
Contracts                      [📝]

── Operations ───────────────
Route                          [🗺]
Employees                      [👤]
Time Clock                     [⏰]
Smart Map                      [📍]

────────────────────────────
Settings                       [⚙]
```

Los divisores se implementan como separadores visuales entre grupos usando el `DIVIDER_AFTER` set existente.

### Comportamiento del sidebar colapsado

En modo colapsado (solo íconos), todos los labels desaparecen pero los íconos permanecen con tooltips. Los divisores también desaparecen en modo colapsado.

---

## Separación CRM — Diseño de Cada Página

### LeadsPage — Layout

Mantener el Kanban existente como vista principal. Añadir un toggle de vista (Kanban | Table) para desktop, donde la tabla sea más conveniente para usuarios con muchos leads.

```
┌── KPI Cards ──────────────────────────────────────────────────┐
│  Total Leads | Active Leads | Hot Leads | Converted            │
└───────────────────────────────────────────────────────────────┘
┌── Toolbar ────────────────────────────────────────────────────┐
│  [All][Active][Won][Lost]    [🔍 Search]  [Grid/List] [+ Lead] │
└───────────────────────────────────────────────────────────────┘
┌── LeadsKanban / LeadsTable ───────────────────────────────────┐
└───────────────────────────────────────────────────────────────┘
```

### ClientsPage — Layout

Tabla existente, con KPIs propios.

### TasksPage — Layout

Tabla existente, con KPIs propios.

---

## Estados de Error y Vacío

Patrón uniforme para todos los módulos nuevos:

**Empty state (sin datos):**
```tsx
<div className="flex flex-col items-center justify-center py-20 text-center gap-3">
  <FeatureIcon className="w-16 h-16 text-muted-foreground/20" strokeWidth={1} />
  <div>
    <p className="font-medium text-foreground">No [feature] yet</p>
    <p className="text-sm text-muted-foreground mt-1">
      [Descripción de cómo crear el primer item]
    </p>
  </div>
  <Button onClick={handleCreate}>
    <Plus className="w-4 h-4 mr-2" />
    [Create first item]
  </Button>
</div>
```

**Error state:**
```tsx
<div className="flex flex-col items-center justify-center py-20 text-center gap-3">
  <AlertCircle className="w-12 h-12 text-destructive/50" />
  <p className="text-muted-foreground">Failed to load [feature]. Please try again.</p>
  <Button variant="outline" onClick={() => refetch()}>Try again</Button>
</div>
```

---

## Animaciones y Transiciones

- Usar las animaciones existentes de shadcn/ui (fade-in para dialogs, slide para sheets)
- No añadir animaciones custom salvo que ya existan en el proyecto
- Las tablas no deben tener animaciones de entrada/salida de filas (performance)
