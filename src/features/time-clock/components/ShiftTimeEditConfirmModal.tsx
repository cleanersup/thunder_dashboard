import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { EditChange } from "../types/timeClock.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: EditChange[];
  onConfirm: () => void;
  isSaving: boolean;
}

export function ShiftTimeEditConfirmModal({ open, onOpenChange, changes, onConfirm, isSaving }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSaving) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Time Edit</DialogTitle>
          <DialogDescription>Review the changes below before saving.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 my-2">
          {changes.map((change) => (
            <div
              key={change.field}
              className="flex items-center justify-between text-sm rounded-lg border border-border px-3 py-2"
            >
              <span className="text-muted-foreground font-medium w-24">{change.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">{change.oldValue || "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold text-foreground">{change.newValue}</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Saving..." : "Confirm Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
