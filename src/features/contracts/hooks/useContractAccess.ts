/**
 * @module useContractAccess
 * Determines whether the current user can access the Contracts feature.
 *
 * Rules:
 *  - essential / professional → always hasAccess
 *  - basic → hasAccess until CONTRACT_CUTOFF_DATE (reason: basic_trial)
 *  - basic after cutoff → no access (reason: basic_expired)
 *  - free / null → no access (reason: no_plan)
 */
import { useSubscription } from "@/features/subscriptions/context/SubscriptionContext";
import { CONTRACT_CUTOFF_DATE } from "../config/contracts.config";

type ContractAccessReason =
  | "essential"
  | "basic_trial"
  | "basic_expired"
  | "no_plan";

interface ContractAccess {
  hasAccess: boolean;
  daysRemaining: number | null;
  reason: ContractAccessReason;
}

export function useContractAccess(): ContractAccess {
  const { planTier } = useSubscription();

  if (planTier === "essential" || planTier === "professional") {
    return { hasAccess: true, daysRemaining: null, reason: "essential" };
  }

  if (planTier === "basic") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(CONTRACT_CUTOFF_DATE);
    cutoff.setHours(0, 0, 0, 0);

    if (today <= cutoff) {
      const msRemaining = cutoff.getTime() - today.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      return { hasAccess: true, daysRemaining, reason: "basic_trial" };
    }

    return { hasAccess: false, daysRemaining: 0, reason: "basic_expired" };
  }

  return { hasAccess: false, daysRemaining: null, reason: "no_plan" };
}
