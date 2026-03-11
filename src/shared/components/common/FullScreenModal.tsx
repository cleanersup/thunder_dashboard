import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";

interface FullScreenModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function FullScreenModal({ open, onClose, children }: FullScreenModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none rounded-none p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        {children}
      </DialogContent>
    </Dialog>
  );
}
