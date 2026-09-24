# Plan: Subscription Upgrade / Downgrade (F13)

> Creado: 2026-04-17
> Estado: pendiente de implementación
> Jira: cambio de plan con proration y downgrade

---

## Arquitectura actual

| Capa | Tecnología |
|---|---|
| Web billing | RevenueCat Web SDK (`@revenuecat/purchases-js`) → Stripe |
| Mobile billing | RevenueCat Mobile SDK → Apple App Store / Google Play |
| Source of truth | Supabase `profiles` (`plan_tier`, `subscription_status`, `subscription_expiry_date`, `revenue_cat_customer_id`) |
| Dashboard refresh | Supabase Realtime listener en `profiles` → ya funciona automáticamente |

---

## Diagnóstico de bugs actuales

### Bug 1 — Downgrade completamente deshabilitado
**Archivo:** `src/features/subscriptions/components/SubscriptionPlansContent.tsx` línea 311
```tsx
// Estado actual — downgrade NUNCA se puede ejecutar
disabled={isCurrent || isDowngrade || buying}
```
El botón de downgrade siempre está deshabilitado. Necesita habilitarse con un flujo de confirmación.

### Bug 2 — Upgrade sin confirmación ni aviso de proration
El flujo de upgrade llama `purchasePackage()` directamente sin mostrarle al usuario cuánto se le va a cobrar. Stripe aplica la proration automáticamente a través de RC, pero el usuario no recibe ninguna advertencia.

### Bug 3 — No se detecta si la suscripción es mobile o web
Si un usuario se suscribió desde Apple/Google y entra al web dashboard, puede intentar cambiar su plan desde web. Esto crearía una suscripción paralela en Stripe. La DB no guarda en qué plataforma se originó la suscripción.

---

## Comportamiento esperado por plataforma

### Web (Stripe vía RC)
| Acción | Comportamiento esperado |
|---|---|
| Upgrade | RC/Stripe aplica proration automática. El usuario paga solo la diferencia proporcional al período restante. El nuevo plan activa inmediatamente. |
| Downgrade | RC schedula el cambio para el fin del período de billing. El usuario mantiene el plan actual hasta que vence, luego baja al plan inferior. |
| Dashboard refresh | Ya funciona vía Supabase Realtime — no requiere cambios. |

### Mobile (Apple App Store / Google Play)
| Acción | Comportamiento esperado |
|---|---|
| Upgrade | La plataforma (Apple/Google) aplica su propia proration. No se puede controlar desde el código. |
| Downgrade | Entra en vigor al final del período. Impuesto por Apple/Google. |
| Dashboard refresh | RC envía webhook → actualiza Supabase → Realtime refresca el dashboard. |

> **IMPORTANTE:** No se puede gestionar una suscripción de Apple/Google desde el web dashboard ni viceversa. Apple/Google son dueños del billing y viola sus políticas intentar cobrar por otro canal.

---

## Plan de implementación

### Paso 1 — Detectar plataforma de origen de la suscripción
Necesitamos saber si la suscripción activa del usuario viene de web (Stripe) o de mobile (Apple/Google).

**Opción A (recomendada):** Agregar columna `subscription_platform` en `profiles` (`'web' | 'apple' | 'google' | null`). El webhook de RC puede poblarla. Requiere migración en `thunder_supabase`.

**Opción B (sin backend):** Intentar leer el `customerInfo` de RC Web SDK y ver si tiene entitlements activos con `store = 'stripe'`. Si no hay entitlements en Stripe, es mobile.

### Paso 2 — Habilitar downgrade con confirmación
En `PlanCard`:
- Remover `isDowngrade` de `disabled`
- Antes de ejecutar: mostrar `AlertDialog` con mensaje:
  > "Your plan will be downgraded to **[Plan Name]** at the end of your current billing period (**[fecha]**). You'll keep [current plan] access until then."
- Confirmar → llamar `purchasePackage(pkg)` (RC Web SDK maneja el scheduling en Stripe)

### Paso 3 — Mostrar aviso de proration en upgrade
En `PlanCard` al hacer upgrade:
- Mostrar `AlertDialog` con mensaje:
  > "You'll be charged the prorated difference for the remainder of your current billing period. Your **[New Plan]** activates immediately."
- Confirmar → llamar `purchasePackage(pkg)`

### Paso 4 — Aviso si la suscripción es mobile
Si se detecta que la suscripción activa es de Apple/Google, mostrar en lugar de los botones de cambio:
> "Your subscription is managed through the App Store / Google Play. To change your plan, go to your device's subscription settings."

### Paso 5 — Verificar configuración RC
Antes de implementar Paso 2 y 3, confirmar en el RC dashboard que:
- [ ] Web Billing está activo con los productos `basic_monthly`, `basic_yearly`, `essential_monthly`, `essential_yearly`, `professional_monthly`, `professional_yearly`
- [ ] Proration está habilitada en la integración de Stripe
- [ ] Los webhooks de RC están actualizando correctamente `plan_tier` y `subscription_status` en Supabase

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/features/subscriptions/components/SubscriptionPlansContent.tsx` | Habilitar downgrade, agregar AlertDialogs de confirmación, detectar plataforma |
| `src/features/subscriptions/hooks/useRevenueCatWeb.ts` | Exponer `customerInfo` para detectar plataforma (Opción B) |
| `src/features/subscriptions/context/SubscriptionContext.tsx` | Agregar `subscriptionPlatform` si se elige Opción A |

**Backend (thunder_supabase) — solo si se elige Opción A:**
- Nueva migración: `ALTER TABLE profiles ADD COLUMN subscription_platform TEXT`
- Actualizar webhook de RC para poblar el campo

---

## Lo que NO hay que hacer

- No calcular manualmente la diferencia de precio — Stripe/RC lo hace automáticamente
- No crear una edge function para cobrar la diferencia — ya está manejado por RC
- No intentar cancelar y re-suscribir al usuario — usar `purchasePackage()` directamente sobre la suscripción activa
- No gestionar suscripciones de Apple/Google desde el web

---

## Consideraciones de UX

- El downgrade no es inmediato → el usuario necesita entenderlo claramente antes de confirmar
- El upgrade sí es inmediato → mostrar un indicador de loading y confirmar el cambio en el dashboard
- Si RC Web Billing no está configurado (`isConfigured = false`), el mensaje actual ya redirige a la app mobile — mantenerlo

---

## Preguntas pendientes antes de implementar

1. ¿Se elige Opción A (columna en DB) u Opción B (leer RC customerInfo) para detectar la plataforma?
2. ¿Se quiere que el downgrade sea inmediato (pérdida de features al instante) o al final del período? La industria estándar y Apple/Google imponen fin de período — se recomienda lo mismo en web para consistencia.
3. ¿El webhook de RC está correctamente configurado para actualizar `profiles` en Supabase después de un cambio de plan?
