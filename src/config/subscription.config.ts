/**
 * Subscription plan configuration for Thunder Pro web.
 * Web subscriptions are managed via Stripe Billing.
 * Source of truth for plan tiers, features, and pricing.
 */

export type PlanTier = "basic" | "essential" | "professional";
export type BillingPeriod = "monthly" | "yearly";

export interface PlanFeatures {
  clients: number | "unlimited";
  employees: number | "unlimited";
  estimates: boolean;
  invoices: boolean;
  routes: boolean;
  smartMap: boolean;
  walkthroughs: boolean;
  advancedReports: boolean;
  stripeConnect: boolean;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  description: string;
  pricing: Record<BillingPeriod, number>;
  features: PlanFeatures;
  recommended?: boolean;
}

export const PLANS: Record<PlanTier, Plan> = {
  basic: {
    tier: "basic",
    name: "Basic",
    description: "For small cleaning businesses getting started",
    pricing: { monthly: 29, yearly: 290 },
    features: {
      clients: 50,
      employees: 2,
      estimates: true,
      invoices: true,
      routes: false,
      smartMap: false,
      walkthroughs: false,
      advancedReports: false,
      stripeConnect: false,
    },
  },
  essential: {
    tier: "essential",
    name: "Essential",
    description: "For growing businesses that need more tools",
    pricing: { monthly: 79, yearly: 790 },
    features: {
      clients: "unlimited",
      employees: 10,
      estimates: true,
      invoices: true,
      routes: true,
      smartMap: true,
      walkthroughs: true,
      advancedReports: false,
      stripeConnect: true,
    },
    recommended: true,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    description: "For established businesses with full operational needs",
    pricing: { monthly: 129, yearly: 1290 },
    features: {
      clients: "unlimited",
      employees: "unlimited",
      estimates: true,
      invoices: true,
      routes: true,
      smartMap: true,
      walkthroughs: true,
      advancedReports: true,
      stripeConnect: true,
    },
  },
};

export const YEARLY_DISCOUNT_PERCENT = 17;
