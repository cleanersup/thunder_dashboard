import { cn } from "@/shared/utils/cn";
import { FORM_CONTROL_HEIGHT } from "@/shared/constants/formTokens";

export interface ReadOnlyFieldProps {
  label: string;
  value: string;
  className?: string;
}

/**
 * Dato fijo dentro de un formulario — se ve como un campo más, pero no se edita.
 *
 * No es un `FloatingInput disabled`: deshabilitado significa "ahora no puedes,
 * quizá luego sí" y se atenúa entero. Esto es un valor que la pantalla muestra
 * porque hace falta para entender el resto del formulario y que no se cambia
 * desde aquí — el país de operación, por ejemplo, que se fija en el registro.
 */
export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          FORM_CONTROL_HEIGHT,
          "flex w-full items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-foreground",
        )}
      >
        {value}
      </div>
      <span className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
