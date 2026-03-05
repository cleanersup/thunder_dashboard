# Thunder Dashboard — Instrucciones permanentes para Claude

> Este archivo es cargado automáticamente por Claude Code al inicio de cada sesión.
> Contiene las reglas de trabajo que aplican a TODAS las fases del proyecto.

---

## Fuentes de verdad

| Qué | Fuente |
|-----|--------|
| Lógica de negocio, flujos, textos | `swift-slate` → `/Users/diegoparedes/Documents/Desarrollo/swift-slate` |
| UX/UI, layout, componentes visuales | `thunder-web-version` → `/Users/diegoparedes/Documents/Desarrollo/thunder-web-version` |
| Backend / DB | Supabase compartido — **NO tocar nada del backend** |

---

## Reglas de implementación (aplican siempre)

### Textos
- Todos los textos visibles deben coincidir EXACTAMENTE con `swift-slate`
- Nunca inventar texto nuevo — buscar siempre el string original en swift-slate

### Arquitectura (SOLID + feature-based)
- **Page = orchestrator delgado**: solo useState + hooks + renderStep(). Sin lógica de negocio directa
- **Step/form components**: dumb, reciben solo sus props, emiten onChange callbacks
- **Hooks**: toda lógica de servidor (queries, mutations, edge functions) va en hooks dentro de `features/<feature>/hooks/`
- **Services**: toda lógica de Supabase va en `features/<feature>/services/`. Las páginas nunca llaman a Supabase directamente
- **No Context para wizard forms** — useState local en la página
- **Shared**: solo componentes/hooks genuinamente reutilizables entre features van en `src/shared/`

### Inputs numéricos
- **NUNCA usar `<Input type="number">`** — tiene UX inconsistente entre browsers y permite valores inesperados
- Usar siempre `<Input type="text">` con `inputMode="numeric"` (enteros) o `inputMode="decimal"` (decimales)
- Aplicar sanitización en `onChange` con las utilidades de `src/shared/utils/numericInput.ts`:
  - `toIntegerString` → solo dígitos enteros (conteos, metraje, cantidades)
  - `toDecimalString` → dígitos con un punto decimal (precios, tarifas, duraciones)
- Ejemplo:
  ```tsx
  import { toIntegerString, toDecimalString } from "@/shared/utils/numericInput";
  <Input type="text" inputMode="numeric" value={val} onChange={(e) => setVal(toIntegerString(e.target.value))} />
  ```

### Colores y estilos
- Usar siempre las variables CSS del theme (`text-primary`, `bg-muted`, `text-foreground`, etc.)
- Nunca hardcodear colores hex o clases de color arbitrarias
- Los colores semánticos (verde para éxito, rojo para destructivo) deben usar `text-green-600`, `text-destructive`, etc. — igual que en el resto del proyecto

### Componentes reutilizables disponibles
- `DetailModal` + `InfoRow` → `src/shared/components/common/DetailModal.tsx`
- `ConfirmDialog` → `src/shared/components/common/ConfirmDialog.tsx`
- `DeliveryMethodSelector` → `src/shared/components/DeliveryMethodSelector.tsx`
- `AddressAutocomplete` → `src/shared/components/AddressAutocomplete.tsx`
- `LoadingSpinner` → `src/shared/components/common/LoadingSpinner.tsx`
- `useGoogleMaps` → `src/shared/hooks/useGoogleMaps.ts`
- `useProfile` + `getCompanyAddress` → `src/shared/hooks/useProfile.ts`
- `EmployeeForm` (modal reutilizable) → `src/features/employees/components/EmployeeForm.tsx`

### Acciones en modales y páginas
- Las acciones disponibles (botones, menús) deben ser exactamente las de swift-slate
- Verificar siempre en swift-slate cuáles acciones existen y cuáles son dinámicas por estado

### Backend
- **NUNCA crear ni modificar archivos en `supabase/functions/`** — el backend no se toca
- Las edge functions ya están desplegadas en el mismo Supabase de swift-slate
- Solo crear hooks frontend que invoquen `supabase.functions.invoke(nombreExacto, { body })`
- Nombres de edge functions relevantes:
  - `send-estimate-email`, `send-estimate-sms`
  - `send-invoice-email`, `send-invoice-sms`, `stripe-create-checkout`
  - `send-appointment-emails` (plural), `send-appointment-sms`

### Verificación obligatoria antes de terminar cada fase
1. `npx tsc --noEmit` → 0 errores
2. `npm run build` → 0 errores
3. Actualizar `PLAN.md`: marcar fase como ✅, añadir entrada al log de sesiones
4. Actualizar `MEMORY.md` con patrones nuevos descubiertos

---

## Plan maestro
`/Users/diegoparedes/Documents/Desarrollo/thunder_dashboard/PLAN.md`

**Para continuar en una nueva sesión:** escribe "continúa con el plan" y leeré el PLAN.md para retomar desde donde quedamos.
