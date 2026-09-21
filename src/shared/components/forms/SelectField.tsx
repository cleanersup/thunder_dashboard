import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  /** Texto guía del control. El asterisco lo añade `required`, no se escribe aquí. */
  placeholder: string;
  value:       string;
  onChange:    (value: string) => void;
  options:     readonly SelectFieldOption[];
  required?:   boolean;
  /** `true` marca el borde; un string además muestra el mensaje debajo. */
  error?:      boolean | string;
  disabled?:   boolean;
  className?:  string;
}

/**
 * Select de una opción con placeholder — envuelve el primitivo para que ningún
 * formulario repita el trío `Select` + `SelectTrigger` + `SelectValue` ni fije
 * alturas a mano. Hover y foco salen de los tokens compartidos.
 */
export function SelectField({
  placeholder,
  value,
  onChange,
  options,
  required = false,
  error,
  disabled = false,
  className,
}: SelectFieldProps) {
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(FORM_CONTROL_HEIGHT, error && FORM_CONTROL_ERROR)}>
          <SelectValue placeholder={withRequiredMark(placeholder, required)} />
        </SelectTrigger>
        <SelectContent>
          {options.map(({ value: v, label }) => (
            <SelectItem key={v} value={v}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
