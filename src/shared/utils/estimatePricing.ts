/**
 * @module estimatePricing
 * Pricing constants and calculation utilities for residential and commercial estimates.
 * Ported from swift-slate for shared use between estimate forms and PDF generation.
 */

// ─── State minimum wages ──────────────────────────────────────────────────────

export const MINIMUM_WAGE_BY_STATE: Record<string, number> = {
  Alabama: 7.25, Alaska: 11.91, Arizona: 14.70, Arkansas: 11.00, California: 17.50,
  Colorado: 14.81, Connecticut: 16.35, Delaware: 15.00, Florida: 14.00, Georgia: 7.25,
  Hawaii: 14.00, Idaho: 7.25, Illinois: 15.00, Indiana: 7.25, Iowa: 7.25, Kansas: 7.25,
  Kentucky: 7.25, Louisiana: 7.25, Maine: 14.65, Maryland: 15.00, Massachusetts: 15.00,
  Michigan: 12.48, Minnesota: 10.85, Mississippi: 7.25, Missouri: 13.75, Montana: 10.55,
  Nebraska: 10.50, Nevada: 10.50, "New Hampshire": 7.25, "New Jersey": 15.49,
  "New Mexico": 12.00, "New York": 15.50, "North Carolina": 7.25, "North Dakota": 7.25,
  Ohio: 10.10, Oklahoma: 7.25, Oregon: 14.70, Pennsylvania: 7.25, "Rhode Island": 15.00,
  "South Carolina": 7.25, "South Dakota": 11.50, Tennessee: 7.25, Texas: 7.25,
  Utah: 7.25, Vermont: 14.01, Virginia: 12.41, Washington: 16.66, "West Virginia": 8.75,
  Wisconsin: 7.25, Wyoming: 7.25, "District of Columbia": 17.50,
};

/** Highest state minimum wage, used as base for pricing calculations. */
export const BASE_MINIMUM_WAGE = 17.50;

// ─── Service modifiers ────────────────────────────────────────────────────────

/** Price multipliers by residential service sub-type. */
export const SERVICE_MODIFIERS: Record<string, number> = {
  "Deep Cleaning":  1.0,   // Base price
  "Once a week":    0.70,  // -30%
  "Bi-weekly":      0.80,  // -20%
  "Move In":        1.12,  // +12%
  "Move Out":       1.30,  // +30%
};

// ─── Residential room prices ─────────────────────────────────────────────────

export const ROOM_PRICES = {
  bedrooms:    55.00,
  kitchen:     55.00,
  livingRoom:  40.00,
  diningRoom:  40.00,
  office:      35.00,
  fullBath:    55.00,
  halfBath:    35.00,
};

export const ADDITIONAL_SERVICE_PRICES = {
  fans:           5.00,
  oven:          35.00,
  blinds:         7.00,
  refrigerator:  35.00,
  windowsInside:  5.00,
  windowsOutside: 6.00,
};

export const EXTRA_PRICES = {
  baseboard:      25.00,
  patio:          25.00,
  walls:          50.00,
  stairs:         10.00,
  cabinetInside:  10.00,
  cabinetOutside: 10.00,
  washDishes:     20.00,
  hallways:       15.00,
  basement:       20.00,
};

export const PET_PRICES = { pets: 25.00, noPets: 0 };
export const LAUNDRY_PRICES = { washDry: 1.65, washDryFold: 2.60 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Adjusts a base price (calculated for the highest minimum-wage state)
 * to the user's state proportionally.
 * @param basePrice - Price computed at BASE_MINIMUM_WAGE
 * @param userState - The service state (e.g. "California")
 * @returns Adjusted price rounded to the nearest dollar
 */
export function calculateAdjustedPrice(basePrice: number, userState: string): number {
  const stateWage = MINIMUM_WAGE_BY_STATE[userState] ?? BASE_MINIMUM_WAGE;
  return Math.round((basePrice / BASE_MINIMUM_WAGE) * stateWage);
}
