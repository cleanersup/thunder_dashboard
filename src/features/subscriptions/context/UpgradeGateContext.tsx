/* eslint-disable react-refresh/only-export-components */
/**
 * @module UpgradeGateContext
 * Plan gate for create and edit actions.
 *
 * The menu is shown in full to every plan; the plan is only checked when the
 * user tries to create or edit. This provider owns the single instance of the
 * upgrade dialog, so pages ask for permission instead of managing modal state.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSubscriptionAccess } from "@/shared/hooks/useSubscriptionAccess";
import { useContractAccess } from "@/features/contracts/hooks/useContractAccess";
import { UpgradeRequiredDialog } from "../components/UpgradeRequiredDialog";
import type { FeatureKey } from "@/shared/config/planFeatures";

interface UpgradeGateContextType {
  /**
   * True when the plan covers the feature. Otherwise opens the upgrade dialog
   * and returns false, so it reads as a guard at the top of a handler.
   *
   * Passing no feature always allows — some actions are not plan-dependent.
   *
   * @param feature - Feature the action belongs to
   * @returns Whether the caller may proceed
   * @example
   * if (!requireFeature("jobs")) return;
   * setJobModalOpen(true);
   */
  requireFeature: (feature?: FeatureKey | null) => boolean;
  /**
   * Pure predicate with no side effects — same rules as `requireFeature` but it
   * never opens the dialog. Lets `WriteGate` decide during render.
   */
  canUseFeature: (feature?: FeatureKey | null) => boolean;
  /** Opens the dialog without checking. For `WriteGate`, which already decided. */
  openUpgrade: (feature: FeatureKey) => void;
}

const UpgradeGateContext = createContext<UpgradeGateContextType | undefined>(undefined);

export function UpgradeGateProvider({ children }: { children: React.ReactNode }) {
  const { hasAccess, currentPlanTier, isLoading } = useSubscriptionAccess();
  const { hasAccess: hasContractAccess } = useContractAccess();
  const [feature, setFeature] = useState<FeatureKey | null>(null);

  const openUpgrade = useCallback((next: FeatureKey) => setFeature(next), []);

  const canUseFeature = useCallback(
    (next?: FeatureKey | null) => {
      if (!next) return true;
      // Mientras la suscripción carga no sabemos el plan. Permitimos pasar en vez
      // de dejar el botón muerto; `WriteGate` espera a que cargue y frena la ruta.
      // Esto también evita que `useContractAccess`, que ignora isLoading y
      // devuelve no_plan con el tier en null, bloquee a un usuario legítimo.
      if (isLoading) return true;
      // Contracts no usa la matriz: conserva la ventana gratuita para Basic.
      return next === "contracts" ? hasContractAccess : hasAccess(next);
    },
    [hasAccess, hasContractAccess, isLoading]
  );

  const requireFeature = useCallback(
    (next?: FeatureKey | null) => {
      if (canUseFeature(next)) return true;
      setFeature(next ?? null);
      return false;
    },
    [canUseFeature]
  );

  const value = useMemo(
    () => ({ requireFeature, canUseFeature, openUpgrade }),
    [requireFeature, canUseFeature, openUpgrade]
  );

  return (
    <UpgradeGateContext.Provider value={value}>
      {children}
      <UpgradeRequiredDialog
        open={feature !== null}
        onOpenChange={(open) => {
          if (!open) setFeature(null);
        }}
        feature={feature}
        currentPlan={currentPlanTier}
      />
    </UpgradeGateContext.Provider>
  );
}

/**
 * Access the plan gate for create/edit actions.
 * @throws When used outside `UpgradeGateProvider`
 */
export function useUpgradeGate(): UpgradeGateContextType {
  const context = useContext(UpgradeGateContext);
  if (context === undefined) {
    throw new Error("useUpgradeGate must be used within UpgradeGateProvider");
  }
  return context;
}
