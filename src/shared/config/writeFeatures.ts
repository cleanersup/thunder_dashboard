/**
 * @module writeFeatures
 * Create/edit routes and the plan feature that governs them.
 *
 * Most create/edit flows in this app are `FullScreenModal`s opened from a list
 * page, so the primary gate lives in those handlers. These routes are the ones
 * that are still reachable directly — deep links, a pasted URL, browser back —
 * and `WriteGate` re-checks them at the router level.
 *
 * Deliberately separate from read routes: lists and details are never gated.
 */

import type { FeatureKey } from "./planFeatures";

/**
 * Route pattern → required feature. `:param` matches any single segment.
 *
 * Clients and their properties are absent on purpose: they are available on
 * every plan.
 */
export const WRITE_ROUTE_FEATURES: Record<string, FeatureKey> = {
  // Requests (incl. the public booking form template)
  "/requests/new": "requests",
  "/requests/edit": "requests",

  // Estimates (residential also serves quick quotes and edit via router state)
  "/estimates/new/residential": "estimates",
  "/estimates/new/commercial": "estimates",

  // Invoices
  "/invoices/new": "invoices",
  "/invoices/:id/edit": "invoices",

  // Walkthroughs (incl. the on-site forms)
  "/walkthroughs/new": "walkthrough",
  "/walkthroughs/:id/edit": "walkthrough",
  "/walkthrough/residential/:id": "walkthrough",
  "/walkthrough/commercial/:id": "walkthrough",

  // Scheduling
  "/create-route/:id/edit": "routes",

  // Contracts
  "/contracts/new": "contracts",
  "/contracts/:id/edit": "contracts",
};

/** Compares a concrete pathname against a pattern containing `:param` segments. */
function matchesPattern(pathname: string, pattern: string): boolean {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return false;
  return patternParts.every(
    (part, i) => part.startsWith(":") || part.toLowerCase() === pathParts[i].toLowerCase()
  );
}

/**
 * Feature required by a write route, or null when the route does not write
 * (and is therefore never gated). Query string and hash are ignored.
 *
 * @param pathname - Current location pathname
 * @returns The required feature, or null when the route is not a write route
 */
export function matchWriteFeature(pathname: string): FeatureKey | null {
  const clean = pathname.split("?")[0].split("#")[0];
  const exact = WRITE_ROUTE_FEATURES[clean];
  if (exact) return exact;
  for (const [pattern, feature] of Object.entries(WRITE_ROUTE_FEATURES)) {
    if (pattern.includes(":") && matchesPattern(clean, pattern)) return feature;
  }
  return null;
}
