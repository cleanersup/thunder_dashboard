import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { formatDisplayTime } from "@/shared/utils/formatters";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface TimeFieldProps {
  id:         string;
  /** Texto guía del campo, dentro cuando está vacío. */
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
 * `input[type=time]` siempre pinta su máscara (`--:--`), así que un campo vacío
 * nunca puede enseñar su texto guía dentro y la etiqueta acababa fuera: era el
 * único control del kit que se veía distinto, y con dos seguidos —Start Time y
 * End Time— la etiqueta es además lo único que los distingue.
 *
 * Por eso el campo solo es `type="time"` mientras se está usando. En reposo es
 * un `type="text"` que muestra la hora ya formateada, o nada si no hay ninguna,
 * y entonces la etiqueta puede descansar dentro como en cualquier otro campo.
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
  const [editing, setEditing] = useState(false);
  const errorMessage = typeof error === "string" ? error : undefined;

  // En reposo se lee "09:00 AM"; al enfocar aparece la máscara y el selector
  // nativo, que necesita el valor crudo "HH:mm".
  const display = editing ? value : value ? formatDisplayTime(value) : "";

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type={editing ? "time" : "text"}
        value={display}
        disabled={disabled}
        // El placeholder va vacío a propósito: quien nombra el campo es la
        // etiqueta flotante, igual que en `FloatingInput`.
        placeholder=" "
        // No se abre el selector al enfocar: en escritorio la hora se teclea, y
        // forzar el desplegable se come la primera pulsación. El icono del reloj
        // del propio control sigue abriéndolo.
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          FORM_CONTROL_HEIGHT,
          "peer px-3",
          error && FORM_CONTROL_ERROR,
        )}
      />
      <Label
        htmlFor={id}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-sm bg-background px-1 transition-all pointer-events-none",
          "peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {withRequiredMark(label, required)}
      </Label>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
    </div>
  );
}
