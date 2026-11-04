import { describe, expect, it } from "vitest";
import {
  FEATURE_NAMES,
  PLAN_FEATURES,
  getMinimumPlanForFeature,
  hasFeatureAccess,
  type FeatureKey,
  type GatingPlanTier,
} from "./planFeatures";

/**
 * The plan matrix is the contract behind every create/edit gate in the app, and
 * it has to stay identical to swift-slate's. These expectations are written as
 * literals on purpose: if someone edits the matrix, a test fails rather than a
 * customer silently gaining or losing a feature.
 */

const ALL_FEATURES: FeatureKey[] = [
  "estimates",
  "invoices",
  "crm",
  "routes",
  "requests",
  "smart_map",
  "employee",
  "time_clock",
  "walkthrough",
  "contracts",
  "tasks",
  "jobs",
];

/** Expected access, mirroring swift-slate's PLAN_FEATURES. */
const EXPECTED: Record<GatingPlanTier, FeatureKey[]> = {
  basic: ["estimates", "invoices", "employee"],
  essential: [
    "estimates",
    "invoices",
    "employee",
    "requests",
    "walkthrough",
    "jobs",
    "routes",
    "contracts",
  ],
  professional: ALL_FEATURES,
};

const TIERS: GatingPlanTier[] = ["basic", "essential", "professional"];

describe("PLAN_FEATURES", () => {
  it("covers exactly the expected features per tier", () => {
    for (const tier of TIERS) {
      expect([...PLAN_FEATURES[tier]].sort()).toEqual([...EXPECTED[tier]].sort());
    }
  });

  it("is cumulative — every tier is a superset of the previous one", () => {
    for (const feature of PLAN_FEATURES.basic) {
      expect(PLAN_FEATURES.essential).toContain(feature);
    }
    for (const feature of PLAN_FEATURES.essential) {
      expect(PLAN_FEATURES.professional).toContain(feature);
    }
  });

  it("gives professional every feature key", () => {
    expect([...PLAN_FEATURES.professional].sort()).toEqual([...ALL_FEATURES].sort());
  });
});

describe("hasFeatureAccess", () => {
  it("resolves every feature against every tier", () => {
    for (const tier of TIERS) {
      for (const feature of ALL_FEATURES) {
        expect(hasFeatureAccess(tier, feature)).toBe(EXPECTED[tier].includes(feature));
      }
    }
  });

  it("denies everything when there is no usable plan", () => {
    for (const tier of [null, undefined, "free"]) {
      for (const feature of ALL_FEATURES) {
        expect(hasFeatureAccess(tier, feature)).toBe(false);
      }
    }
  });

  it("denies, rather than throwing, on a tier outside the union", () => {
    // `profiles.plan_tier` is free text in the database: legacy rows carry
    // values like "premium" that are not part of GatingPlanTier.
    for (const tier of ["premium", "web_pro", "", "PROFESSIONAL"]) {
      expect(() => hasFeatureAccess(tier, "jobs")).not.toThrow();
      expect(hasFeatureAccess(tier, "jobs")).toBe(false);
    }
  });
});

describe("getMinimumPlanForFeature", () => {
  const expectedMinimum: Record<FeatureKey, GatingPlanTier> = {
    estimates: "basic",
    invoices: "basic",
    employee: "basic",
    requests: "essential",
    walkthrough: "essential",
    jobs: "essential",
    routes: "essential",
    contracts: "essential",
    crm: "professional",
    tasks: "professional",
    time_clock: "professional",
    smart_map: "professional",
  };

  it("returns the lowest tier that unlocks each feature", () => {
    for (const feature of ALL_FEATURES) {
      expect(getMinimumPlanForFeature(feature)).toBe(expectedMinimum[feature]);
    }
  });

  it("reports contracts as essential, not professional", () => {
    // Regression: `contracts` used to be missing from PLAN_FEATURES entirely,
    // so this fell through to "professional" and the upgrade prompt named the
    // wrong plan.
    expect(getMinimumPlanForFeature("contracts")).toBe("essential");
  });

  it("agrees with hasFeatureAccess for the tier it names", () => {
    for (const feature of ALL_FEATURES) {
      expect(hasFeatureAccess(getMinimumPlanForFeature(feature), feature)).toBe(true);
    }
  });
});

describe("FEATURE_NAMES", () => {
  it("has a non-empty label for every feature key", () => {
    for (const feature of ALL_FEATURES) {
      expect(FEATURE_NAMES[feature]).toBeTruthy();
    }
  });

  it("has no labels for keys that no longer exist", () => {
    expect(Object.keys(FEATURE_NAMES).sort()).toEqual([...ALL_FEATURES].sort());
  });
});
