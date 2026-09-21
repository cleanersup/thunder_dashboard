import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { FORM_CONTROL_ERROR, FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface TimeFieldProps {
  id:         string;
  /** Etiqueta encima del control — `<input type="time">` no admite placeholder. */
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
 * Hora del día. Es el único campo del kit con etiqueta visible encima en vez de
 * placeholder: `input[type=time]` muestra siempre su propia máscara (`--:--`), así
 * que un placeholder no se vería nunca y el campo quedaría sin nombre.
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
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {withRequiredMark(label, required)}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(FORM_CONTROL_HEIGHT, error && FORM_CONTROL_ERROR)}
      />
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
}
