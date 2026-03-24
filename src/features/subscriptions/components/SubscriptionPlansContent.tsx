/**
 * @module SubscriptionPlansContent
 * Shared subscription plans UI — used by:
 *   - SubscriptionPlansPage (standalone route, wrapped with back button)
 *   - ProfilePage "Subscriptions" section (inline in right panel)
 */
import { useState } from "react";
import {
  Check, Smartphone, Crown, Zap, Building2,
  Calendar, AlertCircle, BadgeCheck, RefreshCw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Label  } from "@/shared/components/ui/label";
import { cn }     from "@/shared/utils/cn";
import { toast }  from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { useRevenueCatWeb } from "../hooks/useRevenueCatWeb";
import type { PlanTier } from "@/features/subscriptions/context/SubscriptionContext";

// ─── Plan definitions ─────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { basic: 1, essential: 2, professional: 3 };

export const PLANS = [
  {
    tier:          "basic" as PlanTier,
    name:          "Basic",
    icon:          Building2,
    accentColor:   "hsl(var(--blue-vibrant))",
    borderClass:   "border-blue-500",
    monthlyPrice:  29,
    annualPrice:   290,
    annualMonthly: 24.17,
    monthlyPkg:    "basic_monthly",
    annualPkg:     "basic_yearly",
    features: [
      "Commercial & residential estimates",
      "Invoice management & Stripe payments",
      "CRM & client management",
      "Employee management",
      "Walkthrough assessments",
      "Online booking request forms",
    ],
  },
  {
    tier:          "essential" as PlanTier,
    name:          "Essential",
    icon:          Zap,
    accentColor:   "hsl(var(--orange-vibrant))",
    borderClass:   "border-orange-500",
    monthlyPrice:  79,
    annualPrice:   790,
    annualMonthly: 65.83,
    monthlyPkg:    "essential_monthly",
    annualPkg:     "essential_yearly",
    popular:       true as const,
    features: [
      "Everything in Basic",
      "Route & scheduling management",
      "Route optimization",
      "Smart appointment booking",
    ],
  },
  {
    tier:          "professional" as PlanTier,
    name:          "Professional",
    icon:          Crown,
    accentColor:   "hsl(var(--green-vibrant))",
    borderClass:   "border-green-500",
    monthlyPrice:  129,
    annualPrice:   1290,
    annualMonthly: 107.50,
    monthlyPkg:    "professional_monthly",
    annualPkg:     "professional_yearly",
    features: [
      "Everything in Essential",
      "Smart Map & real-time tracking",
      "Time Clock & timesheets",
      "Unlimited employees",
      "Workflow automations",
      "All future premium features",
    ],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  try { return format(parseISO(iso), "MMM d, yyyy"); }
  catch { return null; }
}

// ─── Status banner ────────────────────────────────────────────────────────────

export function StatusBanner() {
  const {
    planTier, subscriptionStatus, expiryDate,
    isTrial, trialDaysLeft, hasPaidPlan, isLoading,
  } = useSubscription();
  const expiry = formatExpiry(expiryDate);

  if (isLoading) return null;

  if (isTrial) {
    return (
      <Card className="border border-border/50 shadow-none bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">
              Trial Period — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              You have full Professional access during your trial. Subscribe to keep your features.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasPaidPlan && subscriptionStatus === "active") {
    const planName = PLANS.find(p => p.tier === planTier)?.name ?? planTier;
    return (
      <Card className="border border-border/50 shadow-none bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-green-800 dark:text-green-200">
              {planName} — Active
            </p>
            {expiry && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Renews on {expiry}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionStatus === "cancelled") {
    const planName = PLANS.find(p => p.tier === planTier)?.name ?? planTier;
    return (
      <Card className="border border-border/50 shadow-none bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-orange-800 dark:text-orange-200">
              {planName} — Cancelled
            </p>
            {expiry && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                Access continues until {expiry}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionStatus === "expired") {
    return (
      <Card className="border border-border/50 shadow-none bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-red-800 dark:text-red-200">
              Subscription Expired
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Subscribe to restore access to your features.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: (typeof PLANS)[number];
  billing: "monthly" | "annual";
  currentTier: PlanTier;
  hasPaidPlan: boolean;
  subscriptionStatus: string | null;
  isConfigured: boolean;
  onPurchase: (pkg: string) => Promise<void>;
}

export function PlanCard({
  plan, billing, currentTier, hasPaidPlan,
  subscriptionStatus, isConfigured, onPurchase,
}: PlanCardProps) {
  const [buying, setBuying] = useState(false);

  const isCurrent = plan.tier === currentTier && hasPaidPlan && subscriptionStatus === "active";
  const price     = billing === "monthly" ? plan.monthlyPrice : plan.annualMonthly;
  const pkg       = billing === "monthly" ? plan.monthlyPkg   : plan.annualPkg;
  const Icon      = plan.icon;

  const currentOrder = TIER_ORDER[currentTier ?? ""] ?? 0;
  const planOrder    = TIER_ORDER[plan.tier ?? ""]   ?? 0;
  const isDowngrade  = hasPaidPlan && subscriptionStatus === "active" && planOrder < currentOrder;

  const handleBuy = async () => {
    if (!isConfigured) {
      toast.info("Web subscriptions coming soon. Subscribe via the Thunder Pro mobile app.");
      return;
    }
    setBuying(true);
    try {
      await onPurchase(pkg);
      toast.success("Subscription activated!");
    } catch (err: any) {
      toast.error(err?.message ?? "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  const buttonLabel = () => {
    if (isCurrent)   return "Current Plan";
    if (isDowngrade) return "Downgrade";
    if (hasPaidPlan && subscriptionStatus === "active") return "Switch Plan";
    if (subscriptionStatus === "cancelled") return "Resubscribe";
    return "Subscribe";
  };

  return (
    <Card className={cn(
      "border shadow-none flex flex-col relative overflow-hidden transition-shadow hover:shadow-sm",
      isCurrent ? cn("border-2", plan.borderClass) : "border-border/50",
    )}>
      {isCurrent && (
        <div className="absolute top-0 left-0">
          <div
            className="text-white text-[10px] font-bold px-3 py-1 rounded-br-lg"
            style={{ backgroundColor: plan.accentColor }}
          >
            ACTIVE
          </div>
        </div>
      )}
      {"popular" in plan && plan.popular && (
        <div className="absolute top-0 right-0">
          <div
            className="text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg"
            style={{ backgroundColor: plan.accentColor }}
          >
            MOST POPULAR
          </div>
        </div>
      )}

      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${plan.accentColor}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: plan.accentColor }} />
          </div>
          <span className="font-bold text-base">{plan.name}</span>
        </div>

        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold">${price.toFixed(price % 1 === 0 ? 0 : 2)}</span>
          <span className="text-muted-foreground text-sm pb-1">/mo</span>
        </div>
        {billing === "annual" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Billed ${plan.annualPrice}/year — save 17%
          </p>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-5 flex flex-col flex-1 gap-4">
        <ul className="space-y-2 flex-1">
          {plan.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2 text-sm">
              <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.accentColor }} />
              <span className="text-muted-foreground">{feat}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent || isDowngrade || buying}
          onClick={handleBuy}
          style={
            !isCurrent && !isDowngrade
              ? { backgroundColor: plan.accentColor, borderColor: plan.accentColor }
              : undefined
          }
        >
          {buying ? "Processing..." : buttonLabel()}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main shared content ──────────────────────────────────────────────────────

export function SubscriptionPlansContent() {
  const { user } = useAuth();
  const { planTier, subscriptionStatus, hasPaidPlan, refreshSubscription } = useSubscription();

  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const { isConfigured, purchase, restorePurchases, isLoading: rcLoading } =
    useRevenueCatWeb(user?.id);

  const handlePurchase = async (pkg: string) => {
    await purchase(pkg);
    // First refresh immediately, then again after a short delay to allow
    // the RC → Supabase webhook to process before the user sees the result.
    await refreshSubscription();
    setTimeout(() => refreshSubscription(), 3000);
  };

  const handleRestore = async () => {
    await restorePurchases();
    await refreshSubscription();
    toast.success("Purchases restored");
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <StatusBanner />

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 bg-muted/30 p-3 rounded-lg">
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm font-medium cursor-pointer",
            billing === "monthly" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={billing === "annual"}
          onCheckedChange={(checked) => setBilling(checked ? "annual" : "monthly")}
        />
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm font-medium cursor-pointer",
            billing === "annual" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Annual
        </Label>
        {billing === "annual" && (
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-semibold">
            Save 17%
          </span>
        )}
      </div>

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            billing={billing}
            currentTier={planTier}
            hasPaidPlan={hasPaidPlan}
            subscriptionStatus={subscriptionStatus}
            isConfigured={isConfigured}
            onPurchase={handlePurchase}
          />
        ))}
      </div>

      {/* Bottom notice or restore */}
      {!isConfigured ? (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-4 flex items-start gap-3">
            <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Subscribe via the Thunder Pro mobile app</span>{" "}
                while we set up web billing.
              </p>
              <p>
                Available on{" "}
                <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  App Store
                </a>{" "}
                and{" "}
                <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  Google Play
                </a>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs"
            onClick={handleRestore}
            disabled={rcLoading}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Restore Purchases
          </Button>
        </div>
      )}
    </div>
  );
}
