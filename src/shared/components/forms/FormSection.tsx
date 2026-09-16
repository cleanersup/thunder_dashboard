import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { FORM_FIELD_GAP } from "@/shared/constants/formTokens";

export interface FormSectionProps {
  /** Ícono de la sección — obligatorio: toda sección se identifica por ícono + título. */
  icon:       LucideIcon;
  title:      string;
  /** Línea de apoyo bajo el título. Explica qué se espera de la sección. */
  subtitle?:  string;
  /**
   * Marca el título en rojo. La sección NO lleva asterisco: lo obligatorio se señala
   * en cada campo (`required` en la molécula), porque una sección suele mezclar
   * campos obligatorios y opcionales.
   */
  invalid?:   boolean;
  /** Slot a la derecha del encabezado (contadores, acciones cortas). */
  action?:    ReactNode;
  /** Sin bordes ni esquinas redondeadas — modo página, donde las cards van a sangre. */
  flush?:     boolean;
  className?: string;
  children:   ReactNode;
}

/**
 * Sección de formulario: **ícono + título (+ `*`) + subtítulo**, y debajo los campos.
 *
 * Es la unidad de composición de todo formulario de la app — no escribir encabezados
 * de sección a mano. Solo maqueta: no conoce estado, validación ni datos; el padre le
 * pasa `invalid` y ella lo refleja (OCP: añadir un formulario no obliga a tocarla).
 */
export function FormSection({
  icon: Icon,
  title,
  subtitle,
  invalid = false,
  action,
  flush = false,
  className,
  children,
}: FormSectionProps) {
  return (
    <Card className={cn(flush && "rounded-none border-0", className)}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h2 className={cn(
              "text-lg font-semibold flex items-center gap-2",
              invalid && "text-destructive",
            )}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        <div className={FORM_FIELD_GAP}>{children}</div>
      </CardContent>
    </Card>
  );
}
