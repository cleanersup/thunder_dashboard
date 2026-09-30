import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface TimeFieldProps {
  id:         string;
  /** Nombra el campo. Va flotando sobre el borde, no encima del control. */
  label:      string;
  /** "HH:mm" */
  value:      string;
  onChange:   (value: string) => void;
  required?:  boolean;
  error?:     boolean | string;
  disabled?:  boolean;
  className?: string;
}

/**
 * Hora del día.
 *
 * `input[type=time]` siempre enseña su máscara (`--:--`), así que un placeholder
 * no se vería nunca y la etiqueta no puede descansar dentro del campo. Por eso
 * va directamente en la posición flotada —sobre el borde superior—, la misma que
 * el resto del kit adopta cuando el campo tiene valor.
 *
 * Antes se resolvía poniendo la etiqueta encima del control, y eso le daba más
 * altura que a un `DateField` o un `SelectField`: en una fila de dos columnas los
 * campos quedaban descuadrados.
 */
export function TimeField({
  id,
  label,
  value,
  onChange,
  required = false,
  error,
  disabled = false,
  className,
}: TimeFieldProps) {
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(FORM_CONTROL_HEIGHT, "peer px-3", error && FORM_CONTROL_ERROR)}
      />
      <Label
        htmlFor={id}
        className={cn(
          "absolute left-3 top-0 -translate-y-1/2 text-xs bg-background px-1 pointer-events-none transition-colors",
          error ? "text-destructive" : "text-muted-foreground peer-focus:text-primary",
        )}
      >
        {withRequiredMark(label, required)}
      </Label>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
