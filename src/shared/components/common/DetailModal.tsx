import { Dialog, DialogContent } from "@/shared/components/ui/dialog";

// ─── InfoRow ──────────────────────────────────────────────────────────────────
/** Reusable icon + label + value row used inside detail modals. */
export function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── DetailModal ──────────────────────────────────────────────────────────────
interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional pill badge rendered next to the title in the dark header. */
  badge?: { label: string; className: string };
  children: React.ReactNode;
}

/**
 * Shared shell for detail modals (Client, Lead, Task, etc.).
 * Renders the Dialog wrapper + dark navy header + scrollable body.
 * The DialogContent already provides the close (X) button styled white on lg.
 */
export function DetailModal({ open, onClose, title, badge, children }: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]"
        closeClassName="text-white/70 hover:bg-white/10 hover:text-white"
      >
        {/* ── Dark header ──────────────────────────────────────────────── */}
        <div className="bg-sidebar px-6 py-5">
          <div className="flex items-center gap-3 flex-wrap min-w-0 pr-8">
            <h2 className="text-xl font-bold text-white truncate">{title}</h2>
            {badge && (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full capitalize shrink-0 ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="overflow-y-auto max-h-[calc(90vh-76px)]">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
