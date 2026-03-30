---
name: Contracts feature plan
description: Plan de implementación completo de la feature Contracts, decisiones técnicas, schema y tickets Jira
type: project
---

Feature Contracts en desarrollo activo. Plan aprobado por el usuario.

**Why:** Nueva funcionalidad para gestionar contratos de servicio con clientes/leads.

**How to apply:** Al retomar trabajo en Contracts, leer este archivo para contexto completo antes de tocar código.

---

## Decisiones técnicas acordadas

- Wizard: UNA sola página (`/contracts/new`) con steps internos vía `useState` — igual que `CreateResidentialEstimatePage`. Sin rutas separadas por step.
- Preview step 3: HTML component (sin jsPDF)
- Firma cliente: click "Acepto" → registra IP + timestamp → status Active
- Monthly Revenue: pagos REALES en tabla `contract_payments` (no estimado)
- Mocks: flag `VITE_USE_CONTRACT_MOCKS=true` para desarrollo local
- Drag-to-reorder cláusulas: usar `@dnd-kit` (ya en el proyecto)
- Nuevo cliente en Step 1: reutilizar modal inline existente de estimates/invoices
- Sin IA: company info y cláusulas se pre-populan desde `profile` defaults

## Rutas

```
/contracts                    ← ContractsPage (auth)
/contracts/new                ← CreateContractPage (wizard 3 steps, useState interno)
/contracts/:id/edit           ← CreateContractPage (edit mode, mismo componente)
/public/contract/:token       ← PublicContractPage (sin auth)
```
Ruta vieja `/contract` → redirect a `/contracts`

## Estructura de archivos

```
src/features/contracts/
├── pages/
│   ├── ContractsPage.tsx
│   ├── CreateContractStep1Page.tsx   ← wizard completo (steps 1/2/3 vía useState)
│   └── PublicContractPage.tsx
├── components/
│   ├── ContractDetailModal.tsx     (usa DetailModal + InfoRow)
│   ├── ContractProgressBar.tsx
│   ├── ContractPreview.tsx         (HTML, no jsPDF)
│   ├── ContractStatusBadge.tsx
│   ├── RegisterPaymentModal.tsx
│   └── RenewContractModal.tsx
├── hooks/
│   ├── useContracts.ts
│   ├── useContract.ts
│   ├── useContractNumber.ts
│   ├── useContractPayments.ts
│   ├── useSendContractEmail.ts
│   └── useSendContractSMS.ts
├── services/
│   ├── contractsService.ts
│   └── contractPaymentsService.ts
├── mocks/
│   ├── contractMocks.ts
│   └── contractsMockService.ts
├── types/
│   └── contract.types.ts
└── schemas/
    └── contractSchemas.ts
```

## Schema BD esperado del back

### contracts
id, user_id, contract_number (CTR-YYMM-NNN)
recipient_name, recipient_email, recipient_phone, recipient_address
recipient_type ("client"|"lead"), recipient_id
start_date, end_date, created_at, updated_at, sent_at, accepted_at, renewed_at
who_we_are, why_choose_us, our_services, service_coverage
sections (jsonb), custom_clause_titles (jsonb)
total (numeric), payment_frequency ("one-time"|"weekly"|"biweekly"|"monthly")
status ("Draft"|"Pending"|"Active"|"Expiring"|"Expired")
delivery_method ("email"|"sms"|"both")
accept_token (uuid), accepted_ip (text)

### contract_payments
id, contract_id (FK), user_id
amount (numeric), payment_date (date)
payment_method (text, opcional), notes (text, opcional)
created_at

## Edge functions que el back debe crear
- send-contract-email → recibe contractId
- send-contract-sms → recibe contractId
- accept-contract → recibe token, registra accepted_at + IP, status → Active

## Columns defaults en profiles (ya existen en referencia)
who_we_are_default, why_choose_us_default, our_services_default, service_coverage_default
clause_scope_of_work, clause_purpose_of_agreement, clause_price_and_payment
clause_cancellation_policy, clause_no_refund, clause_non_compete
clause_anti_harassment, clause_liability_insurance, clause_confidentiality

## Status y acciones

Estados: Draft(gris) | Pending(amarillo) | Active(verde) | Expiring(naranja) | Expired(rojo)
Contratos cortos (<30 días): badge "Short", sin estado Expiring

| Acción         | Draft | Pending | Active | Expiring | Expired |
|----------------|-------|---------|--------|----------|---------|
| Editar         | ✅    | ✅      | ❌     | ❌       | ❌      |
| Enviar/Reenviar| ❌    | ✅      | ✅     | ✅       | ❌      |
| Renovar        | ❌    | ❌      | ✅     | ✅       | ❌      |
| Registrar pago | ❌    | ❌      | ✅     | ✅       | ❌      |
| Eliminar       | ✅    | ✅      | ❌     | ❌       | ✅      |

Editar y Renovar abren el mismo wizard. Renovar pre-llena fechas con período siguiente.

## Transición de estado Expiring (la hace el back)
- Duración ≥ 30 días: Active → Expiring cuando falte 1 mes
- Duración 1-29 días: Active → Expired directo (sin Expiring)
- Duración exacta 30 días: Active → Expiring cuando falte 1 semana

## Monthly Revenue
= suma de contract_payments.amount donde payment_date está en el mes actual del usuario

## Tickets Jira (orden de implementación)
CON-1:  Setup & base (tipos, schemas, mocks, rutas)
CON-2:  ContractsPage (lista, KPIs sin Monthly Revenue, filtros, tabla)
CON-3:  Step 1 (destinatario, fechas, monto, company info defaults)
CON-4:  Step 2 (cláusulas con dnd-kit, defaults de perfil)
CON-5:  Step 3 (ContractPreview HTML + DeliveryMethodSelector + envío)
CON-11: ContractPreview component HTML
CON-6:  ContractDetailModal
CON-8:  RenewContractModal
CON-9:  PublicContractPage (aceptación pública con token)
CON-10: Sidebar nav item
CON-12: Access control Basic vs Essential

## ELIMINADO
~~CON-7: RegisterPaymentModal~~ — Monthly Revenue removido del alcance

## Colores — 0 variables nuevas necesarias

Todo mapea a variables semánticas existentes en index.css:

| Status   | Variables CSS                                          |
|----------|--------------------------------------------------------|
| Draft    | --muted / --muted-foreground                          |
| Pending  | --info-subtle / --info-subtle-foreground / -border    |
| Active   | --success-subtle / --success-subtle-foreground / -border |
| Expiring | --warning-subtle / --warning-subtle-foreground / -border |
| Expired  | --destructive (bg /10, border /20)                    |

Bonus: --gradient-contract ya existe (gradiente verde) para el header de ContractsPage.

## Responsive — patrones del proyecto a aplicar

Breakpoint mobile: 1024px vía useIsMobile()

| Pantalla           | Desktop                              | Mobile                                      |
|--------------------|--------------------------------------|---------------------------------------------|
| ContractsPage KPIs | grid-cols-4                          | grid-cols-2                                 |
| Tabla contratos    | 7 columnas                           | hideOnMobile en Período/Frecuencia/Total     |
| Toolbar            | fila horizontal                      | flex-wrap (apilan solos)                    |
| Wizard steps       | max-w-2xl centrado, header/footer fijos | sticky top+bottom, inputs full-width      |
| Wizard tab labels  | ícono + texto                        | solo ícono (hidden sm:block en texto)       |
| DetailModal        | Dialog centrado max-w-lg             | Full-screen (w-screen h-screen)             |
| PublicContractPage | max-w-3xl, preview + botón lado a lado | full-width, botón "Aceptar" sticky fondo  |

## Monthly Revenue — REMOVIDO
Fuera del alcance. No hay tabla contract_payments ni KPI de revenue.
KPI cards en ContractsPage: Activos, Pendientes, Por Expirar, Expirados (4 cards).

## Access control — CON-12

### Reglas
- Essential / Professional → acceso completo, sin restricción
- Basic → acceso hasta CONTRACT_CUTOFF_DATE (fecha_lanzamiento + 90 días)
- Basic después del corte → pantalla bloqueada con CTA de upgrade a Essential

### Implementación (Opción A — fecha de corte fija)
- Constante: `CONTRACT_CUTOFF_DATE` en `src/features/contracts/config/contracts.config.ts`
  - Se define cuando se confirme la fecha de lanzamiento en prod
  - Placeholder en dev: 90 días desde hoy
- Hook: `useContractAccess()` → `{ hasAccess: boolean, daysRemaining: number | null, reason: 'essential' | 'basic_trial' | 'basic_expired' | 'no_plan' }`
- Lógica:
  ```
  if plan === 'essential' || 'professional' → hasAccess = true, reason = 'essential'
  if plan === 'basic' && today <= CONTRACT_CUTOFF_DATE → hasAccess = true, reason = 'basic_trial', daysRemaining = días restantes
  if plan === 'basic' && today > CONTRACT_CUTOFF_DATE → hasAccess = false, reason = 'basic_expired'
  ```
- Sin columna nueva en BD, sin coordinación de back
- Para cambiar la fecha: un solo lugar (`contracts.config.ts`)

### ContractsLockedPage (pantalla de bloqueo)
Mostrada cuando `hasAccess = false`:
- Si `reason = 'basic_expired'`: "Tu acceso gratuito a Contracts expiró. Actualiza a Essential para continuar."
- Botón CTA → navega a `/profile` sección subscriptions
- Banner de aviso (no bloqueante) cuando `reason = 'basic_trial'` y `daysRemaining <= 14`: "Te quedan X días de acceso gratuito"

## Estado actual
Plan aprobado. Implementación no iniciada (2026-03-25).
