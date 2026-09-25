import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/cn";
import { withRequiredMark } from "@/shared/utils/formLabel";
import { FORM_CONTROL_ERROR } from "@/shared/constants/formTokens";

export interface TextareaFieldProps {
  id:     string;
  /** Nombra el campo. A diferencia del resto del kit va encima, no flotante. */
  label:  string;
  /** Ejemplo de qué escribir — complementa a la etiqueta, no la repite. */
  placeholder?: string;
  value:  string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean | string;
  disabled?: boolean;
  /** Alto mínimo del área de texto. Por defecto 100px. */
  minHeight?: string;
  className?: string;
}

/**
 * Texto largo — notas, detalles del servicio, instrucciones.
 *
 * Es, con `TimeField`, la excepción a la etiqueta flotante del kit: el texto guía
 * de un área de varias líneas es una frase larga ("Anything the crew should know
 * before the visit…") que no funciona como nombre del campo, y una etiqueta
 * flotando sobre una caja de 100px quedaría descolgada del contenido. Así que la
 * etiqueta nombra el campo arriba y el placeholder da el ejemplo dentro.
 */
export function TextareaField({
  id,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  error,
  disabled = false,
  minHeight = "min-h-[100px]",
  className,
}: TextareaFieldProps) {
  const errorMessage = typeof error === "string" ? error : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {withRequiredMark(label, required)}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(minHeight, "rounded-md", error && FORM_CONTROL_ERROR)}
      />
      {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
    </div>
  );
}
