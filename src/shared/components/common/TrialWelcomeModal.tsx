/**
 * @module TrialWelcomeModal
 * Shown once per user on first login during their trial period.
 * Marks trial_welcome_shown=true in the DB when dismissed.
 */
import { Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

const FEATURES = [
  "Unlimited Estimates & Invoices",
  "Advanced CRM & Client Management",
  "Smart Map & Route Planning",
  "Employee Management & Time Clock",
  "Online Booking Forms",
];

interface TrialWelcomeModalProps {
  open:          boolean;
  onClose:       () => void;
  trialDaysLeft: number;
  isLegacyUser:  boolean;
}

export function TrialWelcomeModal({ open, onClose, trialDaysLeft, isLegacyUser }: TrialWelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden [&>button:last-child]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/90 to-primary px-6 pt-8 pb-6 text-primary-foreground text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary-foreground">
              {isLegacyUser ? "Thank you for your support!" : "Welcome to Thunder Pro!"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm">
              {isLegacyUser
                ? `Enjoy ${trialDaysLeft} days of full access to all features.`
                : `We're giving you ${trialDaysLeft} days of complete free access.`}
            </DialogDescription>
          </DialogHeader>
          <Badge
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 text-sm font-semibold px-3 py-1"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {trialDaysLeft} days remaining
          </Badge>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Full Access Includes:</p>
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(var(--green-vibrant))" }}>
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            No credit card required. After {trialDaysLeft} days, choose a plan to continue using Thunder Pro.
          </p>

          <Button className="w-full h-11" onClick={onClose}>
            Start My Free Trial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
