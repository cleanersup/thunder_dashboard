import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { RecurringScope } from "../types/job.types";

interface RecurringScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Rojo para la opción "All" cuando la acción es destructiva (delete/cancel). */
  destructive?: boolean;
  onSelect: (scope: RecurringScope) => void;
}

/**
 * Selector de alcance para operar sobre un job recurrente: "This occurrence",
 * "This and following", "All occurrences". Reutilizable por editar/eliminar/cancelar.
 * Equivalente web del RecurringScopeSheet móvil de swift-slate.
 */
export function RecurringScopeDialog({
  open,
  onOpenChange,
  title,
  description,
  destructive,
  onSelect,
}: RecurringScopeDialogProps) {
  const pick = (scope: RecurringScope) => {
    onOpenChange(false);
    onSelect(scope);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => pick("this_only")}>
            This occurrence
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => pick("this_and_following")}>
            This and following
          </Button>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start",
              destructive && "text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive",
            )}
            onClick={() => pick("all")}
          >
            All occurrences
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
