import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";
import type { User } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanTier = "free" | "basic" | "essential" | "professional" | null;
export type SubscriptionStatus = "active" | "cancelled" | "inactive" | "expired" | "trial" | null;

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  expiryDate: string | null;
  isTrial: boolean;
  trialDaysLeft: number;
  isLegacyUser: boolean;
  hasPaidPlan: boolean;
  trialWelcomeShown: boolean;
}

interface SubscriptionContextType extends SubscriptionInfo {
  isLoading: boolean;
  error: string | null;
  /** Manually re-fetches subscription state from Supabase. */
  refreshSubscription: () => Promise<void>;
  /** Marks the trial welcome modal as shown in the DB. */
  markTrialWelcomeShown: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const TRIAL_CUTOFF_DATE = new Date("2025-12-16T00:00:00Z");

const DEV_SUBSCRIPTION: SubscriptionInfo = {
  hasActiveSubscription: true,
  planTier: "professional",
  subscriptionStatus: "active",
  expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  isTrial: false,
  trialDaysLeft: 0,
  isLegacyUser: false,
  hasPaidPlan: true,
  trialWelcomeShown: true,
};

const EMPTY_SUBSCRIPTION: SubscriptionInfo = {
  hasActiveSubscription: false,
  planTier: null,
  subscriptionStatus: null,
  expiryDate: null,
  isTrial: false,
  trialDaysLeft: 0,
  isLegacyUser: false,
  hasPaidPlan: false,
  trialWelcomeShown: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consumes the SubscriptionContext. Must be used inside SubscriptionProvider.
 * @throws Error if used outside SubscriptionProvider
 * @example
 * const { hasActiveSubscription, planTier } = useSubscription();
 */
export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Provides subscription state to the component tree.
 * Reads subscription status from Supabase profiles table (source of truth for both
 * web purchases via Stripe and mobile purchases via RevenueCat).
 * In development (VITE_DISABLE_SUBSCRIPTIONS=true) it mocks a Professional plan.
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [info, setInfo] = useState<SubscriptionInfo>(EMPTY_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load subscription ──
  const loadSubscription = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    // Dev mode: mock active Professional subscription
    if (env.features.disableSubscriptions) {
      setInfo(DEV_SUBSCRIPTION);
      setIsLoading(false);
      return;
    }

    // Auth not yet resolved — keep loading so ProtectedRoute doesn't
    // redirect prematurely with hasActiveSubscription=false.
    if (!currentUser) {
      setInfo(EMPTY_SUBSCRIPTION);
      setIsLoading(true);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "created_at, plan_tier, subscription_status, subscription_expiry_date, revenue_cat_customer_id, trial_start_date, trial_welcome_shown",
        )
        .eq("user_id", currentUser.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setInfo(EMPTY_SUBSCRIPTION);
        return;
      }

      const now = new Date();
      const createdAt = profile?.created_at ? new Date(profile.created_at) : null;
      const isLegacyUser = !!(createdAt && createdAt < TRIAL_CUTOFF_DATE);
      const expiryDate = profile?.subscription_expiry_date ? new Date(profile.subscription_expiry_date) : null;
      const trialWelcomeShown = profile?.trial_welcome_shown ?? false;

      // ── Paid plan check ──
      const isExpired = expiryDate ? expiryDate < now : false;
      const rawStatus = profile?.subscription_status ?? "inactive";
      const hasPaidActive = (rawStatus === "active") && !isExpired && !!profile?.revenue_cat_customer_id;

      if (hasPaidActive && profile?.plan_tier) {
        setInfo({
          hasActiveSubscription: true,
          planTier: profile.plan_tier as PlanTier,
          subscriptionStatus: "active",
          expiryDate: profile.subscription_expiry_date ?? null,
          isTrial: false,
          trialDaysLeft: 0,
          isLegacyUser,
          hasPaidPlan: true,
          trialWelcomeShown,
        });
        return;
      }

      // ── Trial check ──
      const trialStart = profile?.trial_start_date ? new Date(profile.trial_start_date) : createdAt ?? now;
      const trialDays = isLegacyUser ? 30 : 14;
      const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

      if (now < trialEnd) {
        const trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setInfo({
          hasActiveSubscription: true,
          planTier: "professional",
          subscriptionStatus: "trial",
          expiryDate: trialEnd.toISOString(),
          isTrial: true,
          trialDaysLeft,
          isLegacyUser,
          hasPaidPlan: false,
          trialWelcomeShown,
        });
        return;
      }

      // ── Expired / inactive ──
      setInfo({
        hasActiveSubscription: false,
        planTier: profile?.plan_tier as PlanTier ?? null,
        subscriptionStatus: isExpired ? "expired" : "inactive",
        expiryDate: profile?.subscription_expiry_date ?? null,
        isTrial: false,
        trialDaysLeft: 0,
        isLegacyUser,
        hasPaidPlan: false,
        trialWelcomeShown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadSubscription(false);
  }, [loadSubscription]);

  // ── Realtime: profile updates ──
  useEffect(() => {
    if (!currentUser) return;

    channelRef.current = supabase
      .channel(`subscription-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${currentUser.id}` },
        () => loadSubscription(true),
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentUser, loadSubscription]);

  const refreshSubscription = useCallback(() => loadSubscription(false), [loadSubscription]);

  const markTrialWelcomeShown = useCallback(async () => {
    if (!currentUser) return;
    setInfo((prev) => ({ ...prev, trialWelcomeShown: true }));
    await supabase
      .from("profiles")
      .update({ trial_welcome_shown: true })
      .eq("user_id", currentUser.id);
  }, [currentUser]);

  return (
    <SubscriptionContext.Provider value={{ ...info, isLoading, error, refreshSubscription, markTrialWelcomeShown }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
