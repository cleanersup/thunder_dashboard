import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

interface PickerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  options: readonly string[] | string[];
  onSelect: (v: string) => void;
  icon?: React.ElementType;
}

export function PickerDialog({
  open, onOpenChange, title, subtitle, options, onSelect, icon: Icon,
}: PickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </DialogHeader>
        <div className="px-6 py-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {options.map((opt) => (
            <Button
              key={opt}
              variant="outline"
              className="w-full justify-start h-12"
              onClick={() => { onSelect(opt); onOpenChange(false); }}
            >
              {Icon ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{opt}</span>
                </div>
              ) : (
                <span className="font-medium">{opt}</span>
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
