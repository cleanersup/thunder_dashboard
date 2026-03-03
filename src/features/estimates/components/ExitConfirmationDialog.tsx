/**
 * @module ExitConfirmationDialog
 * Shown when the user presses Back on step 0 (would navigate away from the form).
 * Options: "Save Draft" / "Discard" / "Cancel".
 */
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

interface ExitConfirmationDialogProps {
  open:      boolean;
  onSave:    () => void;
  onDiscard: () => void;
  onCancel:  () => void;
}

export function ExitConfirmationDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
}: ExitConfirmationDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save estimate?</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to save your progress as a draft, or discard all changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onDiscard}>
            Discard
          </Button>
          <Button className="flex-1" onClick={onSave}>
            Save Draft
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
