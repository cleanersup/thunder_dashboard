# F23 — Right Side Panel (Detail Views)

> **Estado:** 🔲 Pendiente
> **Creado:** 2026-04-09
> **Prioridad:** Alta — cambio de diseño aprobado por el jefe
> **Referencia visual:** Capturas de pantalla en `/Users/diegoparedes/Desktop/` (Captura 4.25.05 y 4.25.42)

---

## Descripción del cambio

Reemplazar los `Dialog` centrados actuales (detail modals) por un **panel deslizable desde la derecha** en todas las pantallas que tienen vista de detalle al hacer clic en un item de tabla.

### Diseño de referencia (Estimates)

**Header oscuro:**
- ID del item (ej. `EST-9ef07b`) en blanco, bold
- Badge de estado (naranja para Pending, verde para Accepted, etc.)
- Botón X para cerrar (top-right)

**Body scrollable — secciones:**
1. Nombre del cliente (grande, bold)
2. Datos de contacto con iconos (nombre, teléfono, email, dirección)
3. Total Amount (precio grande en color primario/naranja)
4. Net Profit (verde)
5. Service Details (Service Type, Sub Type, Estimate Date, Client View Status)
6. Operation Cost Breakdown (Labor, Supplies, Overhead, Total)
7. Rooms Breakdown (grid)
8. Additional Items
9. Service Scope (texto)
10. Extra Services (lista con checkmarks)

**Footer fijo (bottom):**
- `✓ Accept` — primary verde
- `✉ Send` — outline
- `··· More` — dropdown con: Edit, Share Link, Download PDF, Convert to Invoice, Cancel Estimate (rojo)

---

## Arquitectura

### Principios
- **SRP:** `SidePanel` solo maneja layout/animación, nada del contenido
- **OCP:** cada feature extiende `SidePanel` sin modificarlo
- **DIP:** las páginas dependen de la abstracción `SidePanel`, no de `Dialog`

### Componente base (shared)

**`src/shared/components/common/SidePanel.tsx`**

```ts
interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string                                       // ID del item (EST-xxx, INV-xxx...)
  badge?: { label: string; color: string; bg: string } // badge de estado
  footer?: React.ReactNode                            // botones de acción
  children: React.ReactNode                           // body con el contenido
}
```

- Overlay oscuro semi-transparente detrás del panel (no cubre sidebar)
- Panel: `fixed right-0 top-0 h-screen w-[440px]` con `z-50`
- Transición: `translate-x-full` → `translate-x-0` con `transition-transform duration-300`
- Header: `bg-[#202B3D]` (mismo dark que InvoiceDetailsModal)
- Body: `<ScrollArea className="flex-1">`
- Footer: `border-t border-border p-4` sticky al bottom

### Componentes por feature

| Feature | Componente nuevo | Reemplaza |
|---------|-----------------|-----------|
| Estimates | `EstimateDetailPanel.tsx` | `EstimateDetailsModal.tsx` |
| Invoices | `InvoiceDetailPanel.tsx` | `InvoiceDetailsModal.tsx` |
| CRM Leads | `LeadDetailPanel.tsx` | `LeadDetailModal.tsx` |
| CRM Clients | `ClientDetailPanel.tsx` | `ClientDetailModal.tsx` |
| Contracts | `ContractDetailPanel.tsx` | (modal actual) |

Cada componente:
- Usa `SidePanel` como shell
- Reutiliza los hooks y lógica de acción del modal que reemplaza
- Solo cambia la presentación visual

---

## Plan de implementación (pantalla por pantalla)

### Fase 23a — Componente base `SidePanel` ✅ 2026-04-09

- [x] Crear `src/shared/components/common/SidePanel.tsx`
- [x] Props: `open`, `onClose`, `title`, `badge?`, `footer?`, `children`
- [x] Overlay + slide-in animation desde la derecha
- [x] Header oscuro con título, badge y botón X
- [x] Body con `ScrollArea`
- [x] Footer slot sticky
- [x] Verificar en mobile que ocupa full width (`w-full md:w-[440px]`)
- [x] Renderiza en `document.body` via `createPortal` (evita z-index y overflow conflicts)
- [x] Escape key cierra el panel
- [x] Body scroll lock mientras el panel está abierto
- [x] `tsc --noEmit` + `lint` + `build` limpios

### Fase 23b — Estimates ✅ 2026-04-09

- [x] Crear `src/features/estimates/components/EstimateDetailPanel.tsx`
- [x] Secciones según diseño: client info, total + net profit, service details, cost breakdown, rooms, additional items, pets/laundry, service scope, extra services, discount
- [x] Footer: Accept / Send / More dropdown (por status)
- [x] More dropdown: Edit, Share Link, Download PDF, Convert to Invoice, Cancel Estimate
- [x] Draft footer: Continue / Start Fresh / More (Delete)
- [x] Accepted footer: Add to Route / More
- [x] Reutilizar hooks existentes: `useUpdateEstimateStatus`, `useEstimateShare`, `useSendEstimateEmail`
- [x] Actualizar `EstimatesPage.tsx`: reemplazar `EstimateDetailsModal` con `EstimateDetailPanel`
- [x] `EstimateDetailsModal.tsx` se mantiene (puede tener otros usos futuros)
- [x] `tsc --noEmit` + `build` limpios
- [ ] Validar con el jefe el diseño antes de continuar con otros features

### Fase 23c — Invoices ✅ 2026-04-09

- [x] Crear `src/features/invoices/components/InvoiceDetailPanel.tsx`
- [x] Secciones: datos cliente, line items, totales, attachments
- [x] Footer: Mark as Paid / Send / More (Edit, Download PDF, Cancel)
- [x] Reutilizar hooks de `useInvoices`, `useSendInvoiceEmail`, `useInvoicePDFDownload`
- [x] Actualizar `InvoicesPage.tsx`
- [x] `tsc --noEmit` + `build` limpios

### Fase 23d — CRM Leads ✅ 2026-04-09

- [x] Crear `src/features/crm/leads/components/LeadDetailPanel.tsx`
- [x] Secciones: info personal, dirección, lead details, follow-up, attachments
- [x] Footer: Convert to Client / Edit / More (Delete)
- [x] Reutilizar lógica de `LeadDetailModal.tsx`
- [x] Actualizar `LeadsKanban.tsx` (call site real)
- [x] `tsc --noEmit` + `build` limpios

### Fase 23e — CRM Clients ✅ 2026-04-09

- [x] Crear `src/features/crm/clients/components/ClientDetailPanel.tsx`
- [x] Secciones: info personal (con shortcuts SMS/call/email), billing address, service address, business details
- [x] Footer: Edit / More (Send Estimate, Add to Route, Send Invoice, Deactivate/Activate, Delete)
- [x] Actualizar `ClientsTable.tsx` (call site real)
- [x] `tsc --noEmit` + `build` limpios

### Fase 23f — Contracts ✅ 2026-04-09

- [x] Crear `src/features/contracts/components/ContractDetailPanel.tsx`
- [x] Secciones: datos recipient, contract period, content, timestamps
- [x] Footer: Edit / Resend / Renew / Download PDF / Delete (según status)
- [x] Actualizar `ContractsPage.tsx`
- [x] `tsc --noEmit` + `build` limpios

---

### Fase 23g — Employees ✅ 2026-04-10

- [x] Crear `src/features/employees/components/EmployeeDetailsPanel.tsx`
- [x] Secciones: Personal Info (SMS/call/email shortcuts), Employment Details, Availability, Documents, Timeline
- [x] Footer: Edit · Activate/Suspend · Download PDF · More (Delete)
- [x] Actualizar `EmployeesPage.tsx`
- [x] `tsc --noEmit` + `build` limpios

### Fase 23h — Scheduling (Appointments) ✅ 2026-04-10

- [x] Crear `src/features/scheduling/components/AppointmentDetailPanel.tsx`
- [x] Secciones: Title+Date, Schedule, Service Info, Client Info, Deposit, Documents & Photos, Route Map (Google Maps), Assigned Employees, Notes, Delivery Method
- [x] Footer: Edit · Delete
- [x] Actualizar `RoutesPage.tsx`
- [x] `tsc --noEmit` + `build` limpios

### Fase 23i — Walkthroughs ✅ 2026-04-10

- [x] Crear `src/features/walkthroughs/components/WalkthroughDetailsPanel.tsx`
- [x] Secciones: Contact Info, Walkthrough Details, Assigned Employees
- [x] Footer dinámico por status: Scheduled / Pending / Completed / Cancelled / estimate_sent
- [x] Actualizar `WalkthroughsPage.tsx`
- [x] `tsc --noEmit` + `build` limpios

---

## Checklist de verificación por fase

Antes de marcar cada fase como ✅:
1. `npx tsc --noEmit` → 0 errores
2. `npm run lint` → 0 warnings
3. `npm run build` → 0 errores
4. El panel abre y cierra correctamente con animación
5. El overlay bloquea clicks al contenido de fondo
6. El body hace scroll sin afectar el header/footer
7. El footer muestra las acciones correctas según el estado del item
8. Responsive: full width en mobile, 440px en desktop
9. Actualizar este archivo marcando la fase como ✅

---

## Notas de implementación

- El color del header es `#202B3D` — igual al header de `InvoiceDetailsModal` y `DetailModal` en desktop
- Los colores de badge se toman de los tokens existentes en `styleTokens.ts`
- El overlay **no** debe cubrir el sidebar de navegación — usar `left: var(--sidebar-width)` o equivalente
- Si el sidebar está colapsado, el overlay debe adaptarse
- Mantener los `ConfirmDialog` / `AlertDialog` para acciones destructivas (Cancel, Delete) — estos sí son dialogs centrados y está bien así
- El componente `SidePanel` reemplaza el uso de `DetailModal` en los features listados; `DetailModal` puede mantenerse para otros usos más simples

---

## Log de sesiones

| Fecha | Acción |
|-------|--------|
| 2026-04-09 | Plan creado. Diseño aprobado por el jefe basado en capturas de Estimates |
| 2026-04-09 | Fase 23a completada. `SidePanel` base implementado y verificado. |
| 2026-04-09 | Fase 23b completada. `EstimateDetailPanel` implementado. `EstimatesPage` actualizado. tsc + build limpios. |
| 2026-04-09 | Fase 23c completada. `InvoiceDetailPanel` implementado. `InvoicesPage` actualizado. tsc + build limpios. |
| 2026-04-09 | Fase 23d completada. `LeadDetailPanel` implementado. `LeadsKanban` actualizado. tsc + build limpios. |
| 2026-04-09 | Fase 23e completada. `ClientDetailPanel` implementado. `ClientsTable` actualizado. tsc + build limpios. |
| 2026-04-09 | Fase 23f completada. `ContractDetailPanel` implementado. `ContractsPage` actualizado. tsc + build limpios. |
| 2026-04-10 | Fase 23g completada. `EmployeeDetailsPanel` implementado. `EmployeesPage` actualizado. tsc + build limpios. |
| 2026-04-10 | Fase 23h completada. `AppointmentDetailPanel` implementado (con Google Maps). `RoutesPage` actualizado. tsc + build limpios. |
| 2026-04-10 | Fase 23i completada. `WalkthroughDetailsPanel` implementado. `WalkthroughsPage` actualizado. tsc + build limpios. |
