/**
 * @module useRevenueCatWeb
 * Wrapper around @revenuecat/purchases-js for web subscriptions.
 *
 * Prerequisites (Paso 1 de F13):
 *   1. RC Web Billing configured in RevenueCat dashboard (Billing → Web)
 *   2. Stripe connected to RevenueCat
 *   3. VITE_REVENUECAT_WEB_KEY added to .env
 *
 * Until those are configured, `isConfigured` returns false and purchase()
 * is a no-op. The SubscriptionPlansPage handles this state gracefully.
 */
import { useState, useEffect, useCallback } from "react";

const WEB_KEY = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined;

export interface RCWebState {
  /** True when the SDK is initialised and ready to purchase. */
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  /** Launch the RC / Stripe checkout for a given package identifier. */
  purchase: (packageIdentifier: string) => Promise<void>;
  /** Restore purchases made on any platform. */
  restorePurchases: () => Promise<void>;
}

/**
 * Initialises the RevenueCat Web SDK for the given user.
 * Safe to call even when VITE_REVENUECAT_WEB_KEY is not set — returns
 * isConfigured=false and no-op functions in that case.
 */
export function useRevenueCatWeb(appUserId: string | undefined): RCWebState {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (!WEB_KEY || !appUserId) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { Purchases } = await import("@revenuecat/purchases-js");
        if (cancelled) return;

        // Configure the SDK with the web API key and the Supabase user.id
        // (same appUserID used by the mobile SDK → cross-platform sync)
        await Purchases.configure(WEB_KEY, appUserId);

        if (!cancelled) setIsConfigured(true);
      } catch (err) {
        if (!cancelled) {
          console.error("[RC Web] Init error:", err);
          setError(err instanceof Error ? err.message : "RevenueCat init failed");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [appUserId]);

  const purchase = useCallback(async (packageIdentifier: string) => {
    if (!isConfigured) {
      console.warn("[RC Web] purchase() called before SDK is ready");
      return;
    }
    const { Purchases } = await import("@revenuecat/purchases-js");
    const instance  = Purchases.getSharedInstance();
    const offerings = await instance.getOfferings();
    const current   = offerings.current;
    if (!current) throw new Error("No offerings available");

    // Find the package across all available offerings
    // NOTE: exact API shape verified once RC Web Billing is configured in dashboard
    const allPkgs: any[] = [];
    const offeringsAny = offerings as any;
    const monthly = offeringsAny.current?.monthly ?? offeringsAny.current?.MONTHLY;
    const annual  = offeringsAny.current?.annual  ?? offeringsAny.current?.ANNUAL;
    if (monthly?.availablePackages) allPkgs.push(...monthly.availablePackages);
    if (annual?.availablePackages)  allPkgs.push(...annual.availablePackages);
    // Fallback: iterate all offerings
    if (allPkgs.length === 0 && offeringsAny.all) {
      Object.values(offeringsAny.all).forEach((o: any) => {
        if (o?.availablePackages) allPkgs.push(...o.availablePackages);
      });
    }

    const pkg = allPkgs.find((p: any) => p.identifier === packageIdentifier);
    if (!pkg) throw new Error(`Package "${packageIdentifier}" not found in offerings`);

    await (instance as any).purchasePackage(pkg);
  }, [isConfigured]);

  const restorePurchases = useCallback(async () => {
    if (!isConfigured) return;
    const { Purchases } = await import("@revenuecat/purchases-js");
    await (Purchases.getSharedInstance() as any).restorePurchases();
  }, [isConfigured]);

  return { isConfigured, isLoading, error, purchase, restorePurchases };
}
