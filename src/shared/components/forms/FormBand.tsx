import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { FORM_FIELD_GAP } from "@/shared/constants/formTokens";

export interface FormBandProps {
  /** Encabezado corto en mayúsculas, ej. "PERSONAL INFORMATION". */
  title?: string;
  /** Slot a la derecha del encabezado (ej. el check "Same as billing"). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Banda blanca de un panel lateral — el grupo de campos dentro de un [FormSheet].
 *
 * El cuerpo del panel es gris y cada banda es blanca a todo el ancho, así que el
 * propio fondo separa un grupo de otro sin líneas. Es el mismo recurso que usan las
 * secciones de un hub, en su versión simple: aquí el encabezado es solo texto.
 */
export function FormBand({ title, action, className, children }: FormBandProps) {
  return (
    <div className={cn("bg-card px-6 py-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
          )}
          {action}
        </div>
      )}
      <div className={FORM_FIELD_GAP}>{children}</div>
    </div>
  );
}
