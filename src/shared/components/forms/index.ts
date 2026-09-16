/**
 * Kit de formularios — las piezas con las que se arma cualquier formulario de la app.
 *
 * Capas (diseño atómico):
 *   átomos     → `shared/components/ui/*`      (input, select, textarea, button…)
 *   moléculas  → este directorio               (campo completo: control + guía + error)
 *   organismos → `shared/components/common/*`  (ClientSelect, ServicePropertySelector…)
 *
 * Reglas al construir un formulario:
 *   1. Toda sección es un `FormSection` → ícono + título + subtítulo.
 *   2. Todo control lleva su placeholder; si es obligatorio termina en " *".
 *   3. Hover y foco NUNCA se escriben a mano: salen de `constants/formTokens`.
 *
 * Referencia viva: `features/requests/components/RequestForm.tsx`.
 */
export { FormSection }   from "./FormSection";
export { FloatingInput } from "./FloatingInput";
export { SelectField }   from "./SelectField";
export { DateField }     from "./DateField";
export { OptionGrid }    from "./OptionGrid";

export type { FormSectionProps }   from "./FormSection";
export type { FloatingInputProps, FloatingInputType } from "./FloatingInput";
export type { SelectFieldProps, SelectFieldOption }   from "./SelectField";
export type { DateFieldProps }     from "./DateField";
export type { OptionGridItem }     from "./OptionGrid";
