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
 *      Excepción: `TimeField` y `TextareaField` llevan etiqueta visible encima.
 *   3. Hover y foco NUNCA se escriben a mano: salen de `constants/formTokens`.
 *
 * Referencia viva: `features/requests/components/RequestForm.tsx`.
 */
export { FormSheet }     from "./FormSheet";
export { FormBand }      from "./FormBand";
export { FormSection }   from "./FormSection";
export { SectionModal }  from "./SectionModal";
export { SummaryRow }    from "./SummaryRow";
export { SelectorRow }   from "./SelectorRow";
export { FloatingInput } from "./FloatingInput";
export { SelectField }   from "./SelectField";
export { DateField }     from "./DateField";
export { TimeField }     from "./TimeField";
export { OptionGrid }    from "./OptionGrid";
export { TextareaField } from "./TextareaField";
export { AttachmentsField } from "./AttachmentsField";

export type { FormSheetProps }     from "./FormSheet";
export type { FormBandProps }      from "./FormBand";
export type { FormSectionProps }   from "./FormSection";
export type { SectionModalProps }  from "./SectionModal";
export type { SummaryRowProps }    from "./SummaryRow";
export type { SelectorRowProps }   from "./SelectorRow";
export type { FloatingInputProps, FloatingInputType } from "./FloatingInput";
export type { SelectFieldProps, SelectFieldOption }   from "./SelectField";
export type { DateFieldProps }     from "./DateField";
export type { TimeFieldProps }     from "./TimeField";
export type { OptionGridItem }     from "./OptionGrid";
export type { TextareaFieldProps }  from "./TextareaField";
export type { AttachmentsFieldProps, AttachmentItem } from "./AttachmentsField";
