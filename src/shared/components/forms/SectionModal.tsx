import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";

/**
 * Cómo se presenta la sección:
 *
 * - `sheet` (default) — panel lateral. Editar una parte de algo que sigue ahí detrás:
 *   el hub queda visible y el contenido de una sección (contadores, chips, un textarea)
 *   cabe de sobra en el ancho del panel.
 * - `fullscreen` — toma toda la pantalla. Para un cambio de modo, no una edición
 *   puntual: el review (Summary → Preview → Send), donde además el Preview es un
 *   documento que necesita el ancho para leerse como lo verá el cliente.
 */
export type SectionModalVariant = "sheet" | "fullscreen";

export interface SectionModalProps {
  open:     boolean;
  /** Cerrar sin guardar — el hub restaura el estado previo a abrir. */
  onCancel: () => void;
  title:    string;
  subtitle?: string;
  /** Confirma los cambios de la sección (ya aplicados en vivo) y cierra. */
  onSave:   () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Botón secundario alternativo ("Back" en las pantallas de review). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  isPending?: boolean;
  variant?: SectionModalVariant;
  /**
   * Identifica el contenido que se muestra ahora. Cuando un mismo modal encadena
   * varias pantallas (el review: Summary → Preview → Send), cambiarlo devuelve el
   * scroll arriba — si no, la pantalla siguiente aparece a media altura.
   */
  contentKey?: string;
  children: ReactNode;
}

/**
 * Modal de una sección del hub — el formulario largo no se recorre paso a paso:
 * cada sección se abre aquí, se edita y se confirma.
 *
 * Cerrar con la X o con "Cancel" descarta lo hecho dentro (el hub restaura el
 * snapshot que tomó al abrir); "Save" solo cierra, porque los cambios ya están
 * aplicados en vivo sobre el estado del hub.
 */
export function SectionModal({
  open,
  onCancel,
  title,
  subtitle,
  onSave,
  saveLabel = "Save",
  saveDisabled = false,
  secondaryLabel = "Cancel",
  onSecondary,
  isPending = false,
  variant = "sheet",
  contentKey,
  children,
}: SectionModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [contentKey]);

  // El contenedor decide la forma del par de botones:
  //
  // - lateral → los dos a mitad de ancho cada uno, como el pie de `FormSheet`
  //   (Add Client): en 440px llenar el ancho es lo que se lee bien.
  // - pantalla completa → compactos, secundario a la izquierda y primario a la
  //   derecha, idéntico al pie del formulario. El review es una pantalla más del
  //   mismo formulario, así que sus botones no pueden ser otros.
  const stretch = variant === "sheet";

  const actions = (
    <>
      <Button
        variant="outline"
        type="button"
        size={stretch ? "default" : "sm"}
        className={stretch ? "flex-1" : undefined}
        onClick={onSecondary ?? onCancel}
        disabled={isPending}
      >
        {secondaryLabel}
      </Button>
      <Button
        type="button"
        size={stretch ? "default" : "sm"}
        className={stretch ? "flex-1" : undefined}
        onClick={onSave}
        disabled={saveDisabled || isPending}
      >
        {isPending ? "Sending…" : saveLabel}
      </Button>
    </>
  );

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col gap-0 bg-card"
          // Las sugerencias de Google Places se montan fuera del panel: sin esto,
          // elegir una dirección cerraría la sección y se perdería lo editado.
          onPointerDownOutside={(e) => {
            if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
          }}
        >
          {/* Sin borde: la banda gris del cuerpo ya marca dónde empieza el contenido.
              `bg-card` (blanco) y no `bg-background`, que en este tema es gris claro. */}
          <SheetHeader className="shrink-0 space-y-1 bg-card px-6 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </SheetHeader>

          {/* Bandas: el fondo del panel es gris y cada grupo va en blanco a todo el
              ancho, así el propio fondo hace de separador entre uno y otro. Las Cards
              del contenido pierden borde y esquinas — el marco lo pone el panel. */}
          <div className={cn(
            "min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto bg-muted/40 py-2",
            "[&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:shadow-none",
            // Los steps traen su propio `space-y-*`; aquí el hueco entre bandas lo
            // decide el panel para que todas las secciones separen igual.
            "[&>div]:flex [&>div]:flex-col [&>div]:gap-2 [&>div]:space-y-0",
          )}>
            {children}
          </div>

          {/* Fuera del scroll: fija al pie del panel, igual que en `FormSheet`. */}
          <div className="shrink-0 bg-card px-6 py-4 flex gap-3">
            {actions}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <FullScreenModal open={open} onClose={onCancel}>
      <div className="flex-shrink-0 bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">{title}</h1>
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mismo patrón que la variante lateral: fondo gris, contenido en blanco y los
          botones al final del scroll (no pegados abajo). */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto bg-muted/40 py-2">
        <div className="max-w-2xl mx-auto flex flex-col gap-2 px-4">
          <div className="bg-card p-4">
            {children}
          </div>
          <div className="bg-card p-4 flex items-center justify-between gap-3">
            {actions}
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
}
