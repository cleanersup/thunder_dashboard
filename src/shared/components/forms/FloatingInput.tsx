import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { toIntegerString, toDecimalString } from "@/shared/utils/numericInput";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

/**
 * `integer` / `decimal` nunca usan `<input type="number">` (regla del proyecto):
 * se sanitizan en `onChange` con las utilidades de `numericInput`.
 */
export type FloatingInputType = "text" | "email" | "integer" | "decimal";

export interface FloatingInputProps {
  id:        string;
  /** Hace de etiqueta flotante y de placeholder — no se pasa `placeholder` aparte. */
  label:     string;
  value:     string;
  onChange:  (value: string) => void;
  type?:     FloatingInputType;
  required?: boolean;
  /** `true` marca el borde; un string además muestra el mensaje debajo. */
  error?:    boolean | string;
  disabled?: boolean;
}

const SANITIZERS: Partial<Record<FloatingInputType, (v: string) => string>> = {
  integer: toIntegerString,
  decimal: toDecimalString,
};

const INPUT_MODES: Partial<Record<FloatingInputType, "numeric" | "decimal">> = {
  integer: "numeric",
  decimal: "decimal",
};

/**
 * Campo de texto con etiqueta flotante — el input por defecto de los formularios.
 *
 * La etiqueta ocupa el lugar del placeholder y sube al enfocar o al haber valor, así
 * que cada campo lleva siempre su texto guía sin duplicar un `<Label>` encima.
 */
export function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  error,
  disabled = false,
}: FloatingInputProps) {
  const sanitize     = SANITIZERS[type];
  const hasError     = Boolean(error);
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        type={type === "email" ? "email" : "text"}
        inputMode={INPUT_MODES[type]}
        placeholder=" "
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(sanitize ? sanitize(e.target.value) : e.target.value)}
        className={cn(
          FORM_CONTROL_HEIGHT,
          "peer px-3",
          hasError && FORM_CONTROL_ERROR,
        )}
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-background px-1 transition-all pointer-events-none
          peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
      >
        {withRequiredMark(label, required)}
      </Label>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
