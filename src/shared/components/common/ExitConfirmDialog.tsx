/**
 * @module ExitConfirmDialog
 * Confirmación al salir de un formulario con cambios sin guardar.
 *
 * Reutilizable por cualquier formulario: `onSaveDraft` es opcional, y su presencia
 * cambia el diálogo de dos a tres salidas. Úsalo siempre que cerrar un formulario
 * pueda perder trabajo — no solo donde hay borradores.
 */
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

export interface ExitConfirmDialogProps {
  open: boolean;
  /** Volver al formulario — también al pulsar Escape o fuera del diálogo. */
  onKeepEditing: () => void;
  /** Salir perdiendo los cambios. */
  onDiscard: () => void;
  /**
   * Guardar como borrador y salir. Si se omite, el diálogo solo ofrece volver o
   * descartar (formularios sin borrador, o edición de un registro ya existente).
   */
  onSaveDraft?: () => void;
  /** Qué se está editando, en minúscula: "estimate", "request", "walkthrough". */
  entityLabel?: string;
  isPending?: boolean;
}

export function ExitConfirmDialog({
  open,
  onKeepEditing,
  onDiscard,
  onSaveDraft,
  entityLabel = "form",
  isPending = false,
}: ExitConfirmDialogProps) {
  const canSaveDraft = !!onSaveDraft;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onKeepEditing(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {/* El título nombra la situación en la que está el usuario (se va con trabajo
              sin guardar), no la acción del botón: llegó aquí por cerrar, no por guardar. */}
          <AlertDialogTitle>
            {canSaveDraft ? "Save your progress?" : "Discard changes?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {canSaveDraft
              ? `You can save this ${entityLabel} as a draft and finish it later.`
              : `Your changes to this ${entityLabel} will be lost.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Jerarquía: la acción segura pesa más que la destructiva. Descartar va en
            texto — es la salida menos frecuente y la única que pierde trabajo. */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onKeepEditing}
              disabled={isPending}
            >
              Keep editing
            </Button>
            {canSaveDraft && (
              <Button className="flex-1" onClick={onSaveDraft} disabled={isPending}>
                {isPending ? "Saving…" : "Save draft"}
              </Button>
            )}
          </div>

          <Button
            variant={canSaveDraft ? "ghost" : "destructive"}
            className={canSaveDraft ? "w-full text-destructive hover:text-destructive hover:bg-destructive/10" : "w-full"}
            onClick={onDiscard}
            disabled={isPending}
          >
            {canSaveDraft ? "Discard changes" : "Discard"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
