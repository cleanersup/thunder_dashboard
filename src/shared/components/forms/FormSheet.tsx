import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

export interface FormSheetProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  subtitle?: string;
  /** Texto del botón primario. Por defecto "Save". */
  submitLabel?: string;
  /** Texto mientras guarda. Por defecto "Saving...". */
  submitPendingLabel?: string;
  onSubmit: () => void;
  isPending?: boolean;
  /** Deshabilita el botón primario (validación externa). */
  submitDisabled?: boolean;
  /**
   * El autocompletado de direcciones de Google monta su lista fuera del panel;
   * sin esto, hacer clic en una sugerencia cierra el formulario.
   */
  children: ReactNode;
  className?: string;
}

/**
 * Panel lateral para **crear o editar un registro puntual** — cliente, empleado,
 * propiedad, lead.
 *
 * Es el formulario que se abre DESDE otro formulario (el "+ Add New Client" de un
 * selector, por ejemplo): entra por el costado, deja ver el contexto detrás y al
 * cerrarse devuelve al usuario justo donde estaba. Los formularios principales de
 * una feature (request, walkthrough, job) usan `FullScreenModal`, no esto.
 *
 * La cabecera, el scroll del cuerpo y la barra de acciones viven aquí para que todos
 * los paneles se abran, se cierren y se guarden igual.
 */
export function FormSheet({
  open,
  onClose,
  title,
  subtitle,
  submitLabel = "Save",
  submitPendingLabel = "Saving...",
  onSubmit,
  isPending = false,
  submitDisabled = false,
  children,
  className,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn("w-full sm:max-w-md p-0 flex flex-col gap-0 bg-card", className)}
        // Las sugerencias de Google Places se montan fuera del panel: sin esto,
        // elegir una dirección cerraría el formulario.
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
        }}
      >
        <SheetHeader className="shrink-0 space-y-1 bg-card px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </SheetHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Fondo gris: cada `FormBand` del contenido es blanca a todo el ancho y el
              gris entre ellas hace de separador — también contra la cabecera. */}
          <div className="min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto bg-muted/40 py-2">
            {children}
          </div>

          {/* Fuera del scroll: la barra queda fija al pie del panel, se vea el
              formulario entero o no. En uno largo como Add Client, dejarla al final
              del scroll obligaba a recorrerlo entero solo para llegar a Guardar. */}
          <div className="shrink-0 bg-card px-6 py-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || submitDisabled}>
              {isPending ? submitPendingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
