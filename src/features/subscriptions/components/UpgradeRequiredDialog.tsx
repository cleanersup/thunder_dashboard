/**
 * @module UpgradeRequiredDialog
 * Shown when the user tries to create or edit something their plan does not cover.
 *
 * The menu is available on every plan, so this dialog is the only place the limit
 * surfaces. Copy matches swift-slate's upgrade sheet exactly — do not reword it.
 *
 * Rendered as a single instance by `UpgradeGateProvider`; pages never mount it.
 */
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  FEATURE_NAMES,
  getMinimumPlanForFeature,
  type FeatureKey,
  type GatingPlanTier,
} from "@/shared/config/planFeatures";
import { PLANS } from "../config/plans";

interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Feature the user tried to use. Null while the dialog is closed. */
  feature: FeatureKey | null;
  currentPlan?: GatingPlanTier | null;
}

/** Name and monthly price come from the live plan catalogue, never duplicated here. */
function planCopy(tier: GatingPlanTier) {
  const plan = PLANS.find((p) => p.tier === tier);
  return {
    name: plan ? `${plan.name} Plan` : `${tier.charAt(0).toUpperCase()}${tier.slice(1)} Plan`,
    price: plan ? `$${plan.monthlyPrice}` : null,
  };
}

export function UpgradeRequiredDialog({
  open,
  onOpenChange,
  feature,
  currentPlan,
}: UpgradeRequiredDialogProps) {
  const navigate = useNavigate();

  if (!feature) return null;

  const requiredPlan = getMinimumPlanForFeature(feature);
  const required = planCopy(requiredPlan);
  const featureName = FEATURE_NAMES[feature];

  const handleUpgrade = () => {
    onOpenChange(false);
    // `state.message` alimenta la banda de SubscriptionPlansPage, que ya existía
    // para los items bloqueados del sidebar.
    navigate("/subscription-plans", {
      state: {
        message: `${featureName} requires the ${requiredPlan.toUpperCase()} plan`,
        highlightFeature: feature,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button:last-child]:hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/90 to-primary px-6 pt-8 pb-6 text-primary-foreground text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary-foreground">
              Upgrade Required
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm">
              {featureName} is available on the {required.name} and above.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{required.name}</p>
                {currentPlan && (
                  <p className="text-xs text-muted-foreground">
                    Your current plan: {planCopy(currentPlan).name}
                  </p>
                )}
              </div>
              {required.price && (
                <div className="text-right">
                  <p className="text-xl font-bold">{required.price}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Unlock {featureName} and keep everything you already have.
            </p>
          </div>

          <div className="space-y-2">
            <Button className="w-full h-11" onClick={handleUpgrade}>
              View Plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" className="w-full h-10" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
