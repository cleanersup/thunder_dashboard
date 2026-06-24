// ─── Residential ──────────────────────────────────────────────────────────────

export const RESIDENTIAL_PROPERTY_TYPES = [
  "House", "Apartment", "Townhouse",
] as const;

export const RESIDENTIAL_SERVICE_TYPES = [
  "Deep Cleaning", "Once a Week", "Bi-Weekly",
  "Move In", "Move Out", "Post Construction",
] as const;

export const RESIDENTIAL_EXTRA_SERVICES = [
  "Baseboard", "Patio", "Walls", "Stairs",
  "Cabinets Inside", "Cabinets Outside", "Wash Dishes", "Hallways", "Basements",
] as const;

// ─── Commercial ───────────────────────────────────────────────────────────────

export const COMMERCIAL_PROPERTY_TYPES = [
  "Restaurant", "Food-Truck", "Office Building", "Warehouse",
  "School", "Bank", "Hospital", "Church", "Gym", "Movie Theater",
  "Parking Garage", "Hotel",
] as const;

/** Restaurant / food service properties — show grease/schedule/condition fields. */
export const COMMERCIAL_RESTAURANT_TYPES: readonly string[] = ["Restaurant", "Food-Truck"];

/** Office-style properties — show dust-level + Group-A extra services. */
export const COMMERCIAL_GROUP_A_TYPES: readonly string[] = [
  "Office Building", "Warehouse", "School", "Bank",
  "Hospital", "Church", "Gym", "Movie Theater", "Hotel",
];

export const COMMERCIAL_SERVICE_SCHEDULE_OPTIONS = [
  "Day Shift", "Night Shift",
] as const;

export const COMMERCIAL_GREASE_LEVEL_OPTIONS = [
  "Low", "Medium", "High",
] as const;

export const COMMERCIAL_CONDITION_OPTIONS = [
  "Well Maintained", "Dirty", "Very Dirty",
] as const;

export const WEEK_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export interface FrequencyOption { value: string; label: string }
export const COMMERCIAL_FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: "multiple-per-week", label: "Multiple times per week" },
  { value: "once-per-week",     label: "Once per week" },
  { value: "every-2-weeks",     label: "Every 2 weeks" },
  { value: "every-3-weeks",     label: "Every 3 weeks" },
  { value: "once-per-month",    label: "Once per month" },
];

export const COMMERCIAL_EXTRA_GROUP_A = [
  "Inside Windows", "Outside Windows", "Sidewalks", "Store",
] as const;

export const COMMERCIAL_EXTRA_GROUP_B = [
  "Hoods", "Windows", "Refrigerators",
] as const;

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Maps duration in minutes to human-readable label. */
export const DURATION_LABELS: Record<number, string> = {
  30:  "30 minutes",
  60:  "1 hour",
  90:  "1.5 hours",
  120: "2 hours",
};
