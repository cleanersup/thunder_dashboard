/**
 * @module DraftRecoveryDialog
 * Shown on mount when a saved draft is found.
 * "Continue" → restores draft state; "Start Fresh" → deletes draft and starts blank.
 */
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
import type { DraftData } from "../types/estimate.types";

interface DraftRecoveryDialogProps {
  draft:       { draftData: DraftData; id: string } | null;
  onContinue:  (draft: DraftData) => void;
  onDiscard:   () => void;
}

export function DraftRecoveryDialog({ draft, onContinue, onDiscard }: DraftRecoveryDialogProps) {
  return (
    <AlertDialog open={!!draft}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Continue where you left off?</AlertDialogTitle>
          <AlertDialogDescription>
            You have a saved draft for this estimate. Would you like to continue from where you left off?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => draft && onContinue(draft.draftData)}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
