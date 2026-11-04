# Gating por plan — menú completo, gate al crear/editar

Reescrito el 2026-10-16 para igualar a swift-slate (PR #381). Reemplaza el modelo de candados
en el sidebar que estuvo vigente desde junio de 2026.

## El modelo

El menú se muestra **completo a todos los planes**: la navegación no depende del tier. El plan solo
se comprueba cuando el usuario intenta **crear o editar** (y en las conversiones, que crean
registros). Leer, borrar, enviar y generar PDFs no se gatean nunca.

La idea es que el límite se descubra en el momento de máxima intención de compra, no al abrir el
menú.

## Piezas

| Pieza | Archivo |
|---|---|
| Matriz plan→feature | `src/shared/config/planFeatures.ts` |
| Helpers derivados (memoizados) | `src/shared/hooks/useSubscriptionAccess.ts` |
| El gate | `src/features/subscriptions/context/UpgradeGateContext.tsx` |
| El diálogo (una sola instancia) | `src/features/subscriptions/components/UpgradeRequiredDialog.tsx` |
| Red de ruta para deep links | `src/shared/components/WriteGate.tsx` + `src/shared/config/writeFeatures.ts` |
| Catálogo de planes | `src/features/subscriptions/config/plans.ts` |

`UpgradeGateProvider` se monta **dentro de `BrowserRouter`** (en `app/routes/index.tsx`), no en
`app/providers.tsx`: el diálogo navega, y `providers.tsx` está por fuera del router.

## Decisiones que no son obvias

- **La mayoría de formularios son modales, no rutas.** El `CLAUDE.md` del repo lo codifica: los
  wizards son `FullScreenModal` que abre la página de lista con estado local. Por eso el gate
  principal vive en los handlers que abren el modal, y `WriteGate` solo cubre las 13 rutas de
  escritura que quedan alcanzables directamente.
- **Contracts no usa la matriz para decidir.** `requireFeature("contracts")` delega en
  `useContractAccess`, que mantiene la ventana gratuita de Basic hasta `CONTRACT_CUTOFF_DATE`. La
  matriz solo aporta la etiqueta de "plan mínimo".
- **`requireFeature` permite mientras `isLoading`.** Si bloqueara, el botón quedaría muerto durante
  la carga; `WriteGate` espera a que cargue y frena la ruta. Esto además tapa una fragilidad de
  `useContractAccess`, que ignora `isLoading` y devuelve `no_plan` con el tier en `null`.
- **Clientes y propiedades no se gatean.** La llave `crm` existe por paridad con swift-slate pero no
  gobierna nada: gatear clientes dejaría a Basic sin su función más básica.
- **Smart Map queda accesible en todos los planes**, igual que en móvil: es professional pero de solo
  lectura, así que no tiene ninguna acción de crear que gatear.
- Dos bugs latentes que se arreglaron de paso: `contracts` estaba en `FeatureKey` pero en ningún
  array de `PLAN_FEATURES` (siempre false, y plan mínimo mal etiquetado como professional), y `tasks`
  reusaba la llave `crm`.

## Probar

`VITE_DISABLE_SUBSCRIPTIONS=true` del `.env.local` simula professional, así que el gate no dispara.
Usar el override: `VITE_FORCE_PLAN_TIER=basic npm run dev` (`basic | essential | professional | none`).

## Backend

El gate es **solo de cliente**. La especificación para reforzarlo con RLS está en
`swift-slate/PLAN_GATING_BACKEND_SPEC.md`. Prerequisito crítico anotado allí: hoy
`profiles.plan_tier` lo escribe el propio cliente tras la compra, así que cualquier política RLS es
derrotable mientras eso no se cierre.
