/**
 * @module useRevenueCatWeb
 * Wrapper around @revenuecat/purchases-js for web subscriptions.
 *
 * Prerequisites (Paso 1 de F13):
 *   1. RC Web Billing configured in RevenueCat dashboard (Billing → Web)
 *   2. Stripe connected to RevenueCat
 *   3. VITE_REVENUECAT_WEB_KEY added to .env
 *
 * NOTE: The "default" RC offering may contain only mobile packages.
 * The web offering is found by scanning offerings.all — this lets mobile
 * keep its own "current" offering without affecting the web flow.
 */
import { useState, useEffect, useCallback } from "react";

const WEB_KEY = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined;

export interface RCWebState {
  /** True when the SDK is initialised and at least one web billing package is available. */
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  /** Launch the RC / Stripe checkout for a given package identifier. */
  purchase: (packageIdentifier: string) => Promise<void>;
  /** Restore purchases made on any platform. */
  restorePurchases: () => Promise<void>;
}

/** Collect all availablePackages across every offering. */
function collectAllPackages(offerings: any): any[] {
  const pkgs: any[] = [];
  if (offerings?.current?.availablePackages?.length) {
    pkgs.push(...offerings.current.availablePackages);
  }
  if (offerings?.all) {
    Object.values(offerings.all).forEach((o: any) => {
      if (o?.availablePackages?.length) {
        o.availablePackages.forEach((p: any) => {
          if (!pkgs.some((existing) => existing.identifier === p.identifier)) {
            pkgs.push(p);
          }
        });
      }
    });
  }
  return pkgs;
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

        // Check across ALL offerings — offerings.current may point to the mobile
        // offering which has no web billing packages.
        const instance  = Purchases.getSharedInstance();
        const offerings = await instance.getOfferings();
        const hasWebPackages = collectAllPackages(offerings).length > 0;

        if (!cancelled) {
          console.log("[RC Web] Init OK. Web packages found:", hasWebPackages);
          setIsConfigured(hasWebPackages);
        }
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

    const allPkgs = collectAllPackages(offerings);
    if (allPkgs.length === 0) throw new Error("No web billing packages available");

    const pkg = allPkgs.find((p: any) => p.identifier === packageIdentifier);
    if (!pkg) throw new Error(`Package "${packageIdentifier}" not found`);

    await (instance as any).purchasePackage(pkg);
  }, [isConfigured]);

  const restorePurchases = useCallback(async () => {
    if (!isConfigured) return;
    const { Purchases } = await import("@revenuecat/purchases-js");
    await (Purchases.getSharedInstance() as any).restorePurchases();
  }, [isConfigured]);

  return { isConfigured, isLoading, error, purchase, restorePurchases };
}
