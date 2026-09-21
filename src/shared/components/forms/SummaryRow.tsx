import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface SummaryRowProps {
  icon: LucideIcon;
  /** Línea principal — lo que el usuario eligió. */
  children: ReactNode;
  /** Detalle secundario bajo la línea principal. */
  subtitle?: ReactNode;
}

/**
 * Fila de resumen de una sección ya completada — lo que se ve en el hub cuando la
 * sección tiene datos, en lugar del botón "+ Add …".
 *
 * El formulario largo no muestra todos sus campos a la vez: cada sección se resume
 * en una línea y se edita en su propio modal.
 */
export function SummaryRow({ icon: Icon, children, subtitle }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{children}</div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
