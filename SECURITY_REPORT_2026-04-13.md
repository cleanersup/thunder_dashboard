# Reporte de Seguridad — Sistema de Pagos ThunderPro
**Fecha:** 13 de abril de 2026  
**Clasificación:** Confidencial — Uso interno  
**Preparado por:** Equipo de Ingeniería ThunderPro  

---

## Resumen Ejecutivo

Durante una revisión del sistema de pagos se identificaron vulnerabilidades activas que estaban siendo explotadas por actores externos. Se detectaron transacciones fraudulentas en el dashboard de Stripe: el mismo email y tarjeta realizando más de 15 cobros de $20.00 en menos de 15 minutos, un patrón conocido como **ataque de card testing** (prueba de tarjetas robadas).

Todas las vulnerabilidades identificadas han sido corregidas. Este documento describe los hallazgos, el impacto económico potencial y las medidas implementadas.

---

## 1. Vulnerabilidades Identificadas

### VUL-01 — Pagos duplicados ilimitados en la misma factura
**Severidad:** 🔴 Crítica

**Descripción:**  
Cualquier persona con acceso al link de pago de una factura podía pagar la misma factura un número ilimitado de veces. Cada clic en el botón "Pay" creaba una sesión de pago nueva e independiente en Stripe, sin verificar si la factura ya había sido pagada o si ya existía una sesión activa.

**Impacto:**  
- Un cliente podía cobrar dos veces por el mismo trabajo
- Un atacante podía generar múltiples cargos a una tarjeta robada usando una sola factura como vector
- Aplica tanto a la app web como a la app móvil (comparten el mismo backend)

**Evidencia:** El campo `stripe_session_id` existía en la tabla `invoices` pero nunca se guardaba al crear una sesión, y nunca se consultaba antes de crear una nueva.

---

### VUL-02 — Plataforma usada como vector de card testing
**Severidad:** 🔴 Crítica

**Descripción:**  
Los links de pago públicos de ThunderPro (accesibles sin autenticación) fueron utilizados para probar masivamente si tarjetas de crédito robadas eran válidas. El atacante enviaba cargos pequeños ($20) en rápida sucesión al mismo destinatario.

**Impacto económico para ThunderPro:**  
| Concepto | Costo |
|----------|-------|
| Fee de procesamiento Stripe por cada transacción exitosa | ~2.9% + $0.30/tx |
| Fee de chargeback cuando el dueño real de la tarjeta disputa | $15 por disputa |
| Riesgo de suspensión de cuenta de plataforma por Stripe | Alto si el patrón continúa |

**Evidencia:** 15+ transacciones de $20.00 al mismo email (`maltua565@gmail.com`) con la misma tarjeta (`...2144`) en menos de 15 minutos, registradas en el dashboard de Stripe.

---

### VUL-03 — Sin verificación de origen humano en pagos públicos
**Severidad:** 🟠 Alta

**Descripción:**  
El endpoint de pago no verificaba si quien realizaba el pago era un humano o un script automatizado. Un atacante podía ejecutar ataques programáticamente sin cargar ninguna interfaz, llamando directamente al API con tarjetas robadas en un bucle.

**Impacto:**  
- Facilita ataques automatizados a escala
- Sin esta verificación, las demás protecciones pueden ser eludidas mediante scripts

---

### VUL-04 — URLs de facturas exponen IDs internos de base de datos
**Severidad:** 🟡 Media

**Descripción:**  
Los links de pago de facturas exponen el UUID interno de la factura en la URL:
```
/invoice/payment/a3f9c821-4b2e-4d1a-9c3e-...
```
Esto permite a un atacante:
- Intentar adivinar o enumerar IDs de otras facturas
- Compartir o filtrar accidentalmente el ID con consecuencias imposibles de revertir

**Estado:** Pendiente de corrección (próxima iteración)

---

### VUL-05 — Reglas de protección antifraude de Stripe desactivadas
**Severidad:** 🟠 Alta

**Descripción:**  
El dashboard de Stripe tenía 6 reglas de protección configuradas, pero 4 de ellas estaban **deshabilitadas**, incluyendo el bloqueo por CVC incorrecto y la solicitud de autenticación 3D Secure.

**Impacto:**  
- Transacciones con CVC incorrecto procesándose exitosamente (indicador directo de tarjeta robada)
- Sin capa adicional de autenticación bancaria para pagos de alto riesgo

---

## 2. Correcciones Implementadas

### COR-01 — Guard de sesión única por factura (Backend)
**Corresponde a:** VUL-01  
**Archivos modificados:** `supabase/functions/stripe-create-checkout/index.ts`

Se agregó lógica de validación al inicio del proceso de pago:

1. Si la factura ya está marcada como `Paid` en la base de datos → rechaza con error 409 antes de contactar a Stripe
2. Si la factura ya tiene una sesión de Stripe activa (`stripe_session_id`) → recupera esa sesión y la devuelve en lugar de crear una nueva
3. Si la sesión existente expiró → crea una nueva sesión normalmente
4. Al crear cualquier sesión nueva → guarda inmediatamente el `stripe_session_id` en la factura, protegiendo contra intentos concurrentes

**Resultado:** Una factura solo puede tener una sesión de pago activa a la vez, en cualquier momento, desde cualquier dispositivo o plataforma.

---

### COR-02 — Constraint de unicidad en base de datos (Base de Datos)
**Corresponde a:** VUL-01 (race condition residual)  
**Archivos modificados:** Migración `20260413120000_create_payment_fraud_attempts_table.sql`

Se agregó un constraint `UNIQUE` sobre la columna `stripe_session_id` en la tabla `invoices`. Esto garantiza que incluso si dos requests llegan simultáneamente y pasan el guard a nivel de aplicación, la base de datos rechazará el segundo intento a nivel de infraestructura.

---

### COR-03 — Verificación reCAPTCHA v3 en pagos públicos (Frontend + Backend)
**Corresponde a:** VUL-03  
**Archivos modificados:**  
- `src/features/invoices/pages/PublicInvoicePaymentPage.tsx`  
- `supabase/functions/stripe-create-checkout/index.ts`

Se integró Google reCAPTCHA v3 (invisible, sin fricción para el usuario legítimo):

- Al hacer clic en "Pay", el frontend genera un token de verificación que Google puntúa entre 0.0 (bot) y 1.0 (humano)
- El token se envía al backend junto con la solicitud de pago
- El backend verifica el token con Google antes de proceder
- Si el score es menor a 0.5 → rechaza la solicitud sin llegar a Stripe
- Esta verificación aplica únicamente a pagos públicos (no autenticados), sin afectar el flujo de la app interna

**Resultado:** Scripts y bots automatizados no pueden iniciar sesiones de pago, independientemente de si tienen el link correcto.

---

### COR-04 — Sistema de registro de intentos bloqueados (Base de Datos + Backend)
**Corresponde a:** VUL-01, VUL-02, VUL-03  
**Archivos modificados:** Migración `20260413120000_create_payment_fraud_attempts_table.sql`, `stripe-create-checkout`

Se creó la tabla `payment_fraud_attempts` que registra cada intento bloqueado con:

| Campo | Descripción |
|-------|-------------|
| `reason` | Motivo del bloqueo: `already_paid`, `duplicate_session`, `recaptcha_failed`, `recaptcha_missing` |
| `invoice_id` | Factura que fue objetivo del intento |
| `merchant_user_id` | Merchant cuya factura fue atacada |
| `ip_address` | IP de origen del atacante |
| `user_agent` | Identificador del cliente (los bots se delatan: `python-requests/2.28`, etc.) |
| `blocked_at` | Timestamp exacto del intento |
| `metadata` | Contexto adicional: email del cliente, score de reCAPTCHA, etc. |

**Acceso:** Solo los merchants autenticados pueden consultar los intentos sobre sus propias facturas.

---

### COR-05 — Activación de reglas Stripe Radar (Dashboard de Stripe)
**Corresponde a:** VUL-02, VUL-05  
**Sin cambios de código — configuración en Stripe Dashboard**

Se habilitaron las siguientes reglas que estaban desactivadas:

| Regla | Acción | Efecto |
|-------|--------|--------|
| CVC incorrecto | Bloquear | Rechaza tarjetas robadas donde el atacante no tiene el CVC |
| Código postal incorrecto | Bloquear | Rechaza tarjetas sin datos completos del titular |
| Solicitar 3D Secure | Activar | Requiere autenticación bancaria adicional cuando el banco lo soporta |
| Risk level `elevated` | Revisar | Envía a cola de revisión manual transacciones sospechosas |

La regla de bloqueo por `risk_level = 'highest'` ya estaba activa y había bloqueado $435.00 en transacciones fraudulentas.

---

## 3. Estado actual — Capas de protección

```
[Cliente hace clic en "Pay"]
        │
        ▼
[1] reCAPTCHA v3 — ¿es humano? (score ≥ 0.5)
    └── NO → Bloqueado, log registrado
        │
        ▼
[2] ¿Factura ya está Paid?
    └── SÍ → Bloqueado, log registrado
        │
        ▼
[3] ¿Ya existe sesión activa de Stripe?
    └── SÍ → Devuelve misma sesión, log registrado
        │
        ▼
[4] Crea sesión nueva → guarda stripe_session_id (constraint UNIQUE en DB)
        │
        ▼
[5] Stripe Radar — CVC, ZIP, 3DS, risk score
    └── FALLA → Bloqueado por Stripe, visible en dashboard
        │
        ▼
[6] Cliente completa pago → webhook marca factura como Paid
```

---

### COR-06 — Tokens opacos en URLs de facturas (Base de Datos + Backend + Frontend)
**Corresponde a:** VUL-04  
**Archivos modificados:**
- Migración `20260413130000_add_invoice_payment_token.sql`
- `supabase/functions/send-invoice-email/index.ts`
- `supabase/functions/send-invoice-reminders/index.ts`
- `src/features/invoices/pages/PublicInvoicePaymentPage.tsx`
- `src/features/invoices/services/invoicesService.ts`
- `src/features/invoices/hooks/useSendInvoiceSMS.ts`
- `src/features/invoices/pages/InvoicePreviewPage.tsx`
- `src/app/routes/index.tsx`

Se reemplazó el UUID interno en las URLs públicas de pago por un token opaco generado criptográficamente, siguiendo el mismo patrón que ya usa el módulo de Estimates:

```
Antes:  /invoice/payment/a3f9c821-4b2e-4d1a-9c3e-...  (UUID expuesto, enumerable)
Ahora:  /invoice/payment/xK9mP2qR7nJcBvLt_4eHsA       (token opaco, imposible de adivinar)
```

Detalles de implementación:
- Nueva columna `payment_token TEXT UNIQUE` en la tabla `invoices`
- Trigger de base de datos auto-genera el token en cada INSERT (invoices nuevas)
- Backfill ejecutado sobre todas las invoices existentes en producción
- Los emails y SMS de pago ahora incluyen el link con token
- La ruta pública `/invoice/payment/:token` acepta tokens
- **Compatibilidad hacia atrás garantizada:** links viejos con UUID redirigen automáticamente al nuevo formato sin romper el flujo del cliente

---

### COR-07 — Re-envío de links a clientes con facturas pendientes (Frontend)
**Corresponde a:** VUL-04 (transición en producción)  
**Archivos modificados:** `src/features/invoices/pages/InvoicesPage.tsx`

Para cerrar el ciclo en producción sin interrumpir a clientes con facturas pendientes, se agregó un botón **"Re-send links (N)"** en el dashboard de invoices:

- Visible únicamente cuando existen invoices en estado `Pending`
- Al confirmar, re-envía el email con el nuevo link (token) a cada cliente pendiente
- Muestra progreso en tiempo real (`3/8`, `4/8`...)
- Los merchants pueden ejecutarlo cuando consideren oportuno, sin ser forzados

---

## 4. Estado actual — Capas de protección

```
[Cliente abre link de pago]
        │
        ├── Link con UUID (legacy) → redirect automático a URL con token
        │
        ▼
[1] URL con token opaco — imposible de adivinar o enumerar
        │
        ▼
[2] reCAPTCHA v3 — ¿es humano? (score ≥ 0.5)
    └── NO → Bloqueado, log registrado en payment_fraud_attempts
        │
        ▼
[3] ¿Factura ya está Paid?
    └── SÍ → Bloqueado, log registrado
        │
        ▼
[4] ¿Ya existe sesión activa de Stripe?
    └── SÍ → Devuelve misma sesión, log registrado
        │
        ▼
[5] Crea sesión nueva → guarda stripe_session_id
    └── Constraint UNIQUE en DB cierra race conditions
        │
        ▼
[6] Stripe Radar — CVC, ZIP, 3DS, risk score
    └── FALLA → Bloqueado por Stripe, visible en dashboard
        │
        ▼
[7] Cliente completa pago → webhook marca factura como Paid
```

---

## 5. Pendientes

No quedan vulnerabilidades críticas o altas sin resolver. Las siguientes son mejoras opcionales:

1. **Activar "Radar para Equipos de Fraude"** ($0.02/tx revisada, 30 días de prueba gratis): permite configurar reglas de velocidad personalizadas como bloquear si el mismo email intenta más de 3 pagos en 24h. Las reglas actuales son las predeterminadas de Stripe; el plan de pago agrega reglas custom de velocidad.

2. **Dashboard de seguridad en la app:** La tabla `payment_fraud_attempts` ya almacena todos los intentos bloqueados. Se puede construir una sección "Security" en ThunderPro para que los merchants visualicen ataques sobre sus facturas en tiempo real.

3. **reCAPTCHA en la app móvil (swift-slate):** La protección de reCAPTCHA se implementó en la app web. Aplicar la misma integración en iOS/Android cierra el vector equivalente en el cliente móvil.

---

## 6. Resumen de archivos modificados

| Archivo | Tipo | Corrección |
|---------|------|-----------|
| `supabase/functions/stripe-create-checkout/index.ts` | Backend | COR-01, COR-03, COR-04 |
| `supabase/functions/send-invoice-email/index.ts` | Backend | COR-06 |
| `supabase/functions/send-invoice-reminders/index.ts` | Backend | COR-06 |
| `migrations/20260413120000_create_payment_fraud_attempts_table.sql` | DB | COR-02, COR-04 |
| `migrations/20260413130000_add_invoice_payment_token.sql` | DB | COR-06 |
| `src/features/invoices/pages/PublicInvoicePaymentPage.tsx` | Frontend | COR-03, COR-06 |
| `src/features/invoices/pages/InvoicesPage.tsx` | Frontend | COR-07 |
| `src/features/invoices/pages/InvoicePreviewPage.tsx` | Frontend | COR-06 |
| `src/features/invoices/services/invoicesService.ts` | Frontend | COR-06 |
| `src/features/invoices/hooks/useSendInvoiceSMS.ts` | Frontend | COR-06 |
| `src/features/invoices/types/invoice.types.ts` | Frontend | COR-06 |
| `src/app/routes/index.tsx` | Frontend | COR-06 |
| Stripe Dashboard (Radar) | Configuración | COR-05 |

---

*Documento preparado por el equipo de ingeniería de ThunderPro.*  
*Última actualización: 13 de abril de 2026*  
*Clasificación: Confidencial — No distribuir externamente.*
