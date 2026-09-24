import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { cn } from "@/shared/utils/cn";

interface ConfirmDialogProps {
  /** Controls dialog visibility. */
  open: boolean;
  /** Called when the dialog open state changes (e.g. clicking outside). */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading. */
  title: string;
  /** Supporting message to clarify the action. */
  description?: string;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Visual variant of the confirm button. Use "destructive" for delete actions. */
  variant?: "default" | "destructive";
  /** Whether the confirm action is in a loading/pending state. */
  isLoading?: boolean;
  /** Callback invoked when the user confirms. */
  onConfirm: () => void;
}

/**
 * Reusable confirmation dialog built on AlertDialog.
 * Use for any destructive or irreversible action (delete, cancel, remove).
 *
 * @example
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete client?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isLoading ? "Processing…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
