/**
 * @module plans
 * Live subscription plan catalogue — names, pricing and RevenueCat package ids.
 *
 * Single source of truth for plan presentation: consumed by
 * `SubscriptionPlansContent` and by `UpgradeRequiredDialog`, so the upgrade
 * prompt never duplicates prices.
 */
import { Building2, Crown, Zap } from "lucide-react";
import type { PlanTier } from "@/features/subscriptions/context/SubscriptionContext";

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

export type Plan = (typeof PLANS)[number];
