import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSubscriptionAccess } from "./useSubscriptionAccess";
import type { PlanTier } from "@/features/subscriptions/context/SubscriptionContext";

/**
 * The subscription context is mocked so these tests cover the derivation logic
 * only — resolving the tier and keeping the callbacks stable. The matrix itself
 * is covered in `planFeatures.test.ts`.
 */
const useSubscriptionMock = vi.fn();

vi.mock("@/features/subscriptions/context/SubscriptionContext", () => ({
  useSubscription: () => useSubscriptionMock(),
}));

function mockSubscription(planTier: PlanTier, isLoading = false) {
  useSubscriptionMock.mockReturnValue({ planTier, isLoading });
}

beforeEach(() => {
  useSubscriptionMock.mockReset();
});

describe("useSubscriptionAccess", () => {
  it("exposes the tier coming from the subscription", () => {
    mockSubscription("essential");
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.currentPlanTier).toBe("essential");
  });

  it("treats 'free' and null as no plan at all", () => {
    for (const tier of ["free", null] as PlanTier[]) {
      mockSubscription(tier);
      const { result } = renderHook(() => useSubscriptionAccess());
      expect(result.current.currentPlanTier).toBeNull();
      expect(result.current.hasAccess("estimates")).toBe(false);
    }
  });

  it("grants only the features the tier covers", () => {
    mockSubscription("basic");
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.hasAccess("estimates")).toBe(true);
    expect(result.current.hasAccess("invoices")).toBe(true);
    expect(result.current.hasAccess("employee")).toBe(true);
    expect(result.current.hasAccess("jobs")).toBe(false);
    expect(result.current.hasAccess("tasks")).toBe(false);
    expect(result.current.hasAccess("contracts")).toBe(false);
  });

  it("gives a trial user — resolved as professional upstream — everything", () => {
    mockSubscription("professional");
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.hasAccess("smart_map")).toBe(true);
    expect(result.current.hasAccess("time_clock")).toBe(true);
    expect(result.current.hasAccess("tasks")).toBe(true);
  });

  it("reports the required plan and the readable name for upgrade copy", () => {
    mockSubscription("basic");
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.getRequiredPlan("jobs")).toBe("essential");
    expect(result.current.getRequiredPlan("tasks")).toBe("professional");
    expect(result.current.getFeatureName("time_clock")).toBe("Time Clock");
  });

  it("passes isLoading through", () => {
    mockSubscription(null, true);
    const { result } = renderHook(() => useSubscriptionAccess());
    expect(result.current.isLoading).toBe(true);
  });

  it("keeps callback identity stable across re-renders", () => {
    // Effects across the app list these in their dependency arrays; unstable
    // identities would make those effects run on every render.
    mockSubscription("essential");
    const { result, rerender } = renderHook(() => useSubscriptionAccess());
    const first = result.current;
    rerender();
    expect(result.current.hasAccess).toBe(first.hasAccess);
    expect(result.current.getRequiredPlan).toBe(first.getRequiredPlan);
    expect(result.current.getFeatureName).toBe(first.getFeatureName);
    expect(result.current).toBe(first);
  });

  it("produces a new hasAccess when the tier changes", () => {
    mockSubscription("basic");
    const { result, rerender } = renderHook(() => useSubscriptionAccess());
    const basicHasAccess = result.current.hasAccess;
    mockSubscription("professional");
    rerender();
    expect(result.current.hasAccess).not.toBe(basicHasAccess);
    expect(result.current.hasAccess("tasks")).toBe(true);
  });
});
