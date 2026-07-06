/**
 * Onboarding status for employees — reflects whether the employee has
 * downloaded the app and logged in for the first time.
 *
 * Derived (read-only) from `employees.activated_at`, which the backend sets
 * on the first OTP login. This is INDEPENDENT from employment `status`
 * (active/suspended/inactive) that the owner changes manually.
 *
 * Labels/colors are centralised here — never inline in components.
 */

export type OnboardingStatus = "invited" | "activated";

/** `activated_at == null` → "invited"; a date → "activated". */
export function getOnboardingStatus(activatedAt: string | null): OnboardingStatus {
  return activatedAt ? "activated" : "invited";
}

/** Human-readable label shown in table + detail badges. */
export const ONBOARDING_STATUS_LABEL: Record<OnboardingStatus, string> = {
  invited:   "Invited",
  activated: "Activated",
};

/** Soft pill with border — theme tokens only, no hardcoded colors. */
export const ONBOARDING_STATUS_BADGE: Record<OnboardingStatus, string> = {
  invited:   "bg-warning-subtle text-warning-subtle-foreground border-warning-subtle-border",
  activated: "bg-success-subtle text-success-subtle-foreground border-success-subtle-border",
};
