/**
 * @module StripeCheckModal
 * Shown on /invoices/new when Stripe is not configured.
 * UI matches the app's existing modal/dialog style.
 */
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useStripeConnect } from "../hooks/useStripeConnect";

interface StripeCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StripeCheckModal({ open, onOpenChange }: StripeCheckModalProps) {
  const { initiateOnboarding, loading } = useStripeConnect();

  async function handleConnect() {
    await initiateOnboarding();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        {/* ── Dark header ─────────────────────────────────────────────── */}
        <div className="bg-sidebar px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-blue-500/20 shrink-0">
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-base font-bold text-white leading-tight">
              Connect Stripe to accept payments
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-4">
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Connect Stripe to allow customers to securely pay invoices online.
          </DialogDescription>

          <div className="space-y-2">
            <Button
              className="w-full h-10"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect Stripe
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 border-border hover:bg-secondary/50"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
