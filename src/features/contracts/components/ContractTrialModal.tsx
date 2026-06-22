/**
 * @module ContractTrialModal
 * Shown once when a basic-plan user enters the Contracts page during the trial period.
 * Informs them that Contracts is temporarily available for free and when it expires.
 * Dismissal is persisted in localStorage so it only appears once per browser.
 */
import { FileSignature, Clock, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { format } from "date-fns";
import { CONTRACT_CUTOFF_DATE } from "../config/contracts.config";
import { markContractTrialModalShown } from "../utils/contractTrialStorage";

interface ContractTrialModalProps {
  open:          boolean;
  daysRemaining: number;
  onClose:       () => void;
}

export function ContractTrialModal({ open, daysRemaining, onClose }: ContractTrialModalProps) {
  const cutoffFormatted = format(CONTRACT_CUTOFF_DATE, "MMMM d, yyyy");

  const handleClose = () => {
    markContractTrialModalShown();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button:last-child]:hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/90 to-primary px-6 pt-8 pb-6 text-primary-foreground text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <FileSignature className="w-7 h-7" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary-foreground">
              Contracts — Free for a Limited Time
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm">
              We're giving all users free access to Contracts during our launch period.
            </DialogDescription>
          </DialogHeader>
          <Badge
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 text-sm font-semibold px-3 py-1"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </Badge>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Included during free access:</p>
            <ul className="space-y-2">
              {[
                "Create and send unlimited contracts",
                "Digital signature via email or SMS",
                "PDF download and contract preview",
                "Client acceptance tracking",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "hsl(var(--green-vibrant))" }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            Free access ends on <span className="font-semibold text-foreground">{cutoffFormatted}</span>.
            After that, Contracts will require the <strong>Essential plan ($79/mo)</strong> or higher.
          </p>

          <Button className="w-full h-11" onClick={handleClose}>
            Got it, let me explore!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
