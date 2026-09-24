/**
 * Maps completed walkthrough on-site data (DB rows) into estimate `prefill` payloads.
 * Only includes fields that exist on both sides; no fabricated values.
 */
import type { ExtrasState } from "@/features/estimates/components/residential/ResExtrasStep";
import type { WalkthroughWithContact } from "../services/walkthroughsService";

/** Walkthrough UI labels → estimate ResServiceStep option strings */
const RESIDENTIAL_SERVICE_WALKTHROUGH_TO_ESTIMATE: Record<string, string> = {
  "Deep Cleaning": "Deep Cleaning",
  "Once a Week": "Once a week",
  "Bi-Weekly": "Bi-weekly",
  "Move In": "Move In",
  "Move Out": "Move Out",
  "Post Construction": "Post Construction",
};

/** Walkthrough extra label → ResExtrasStep key */
const RESIDENTIAL_EXTRA_LABEL_TO_KEY: Record<string, keyof ExtrasState> = {
  Baseboard: "baseboard",
  Patio: "patio",
  Walls: "walls",
  Stairs: "stairs",
  "Cabinets Inside": "cabinetInside",
  "Cabinets Outside": "cabinetOutside",
  "Wash Dishes": "washDishes",
  Hallways: "hallways",
  Basements: "basement",
};

/** Walkthrough commercial display labels → CommPropertyStep `propertyType` values */
const COMMERCIAL_PROPERTY_WALKTHROUGH_TO_ESTIMATE: Record<string, string> = {
  Restaurant: "restaurant",
  "Food-Truck": "food-truck",
  "Office Building": "office",
  Warehouse: "warehouse",
  School: "school",
  Bank: "bank",
  Hospital: "clinic",
  Church: "church",
  Gym: "gym",
  "Movie Theater": "movie-theater",
  Hotel: "hotel",
  "Auto Dealership": "auto-dealership",
};

function parseIntSafe(v: string | null | undefined): number {
  if (v == null || String(v).trim() === "") return 0;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(v: string | null | undefined): number {
  if (v == null || String(v).trim() === "") return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function extrasFromWalkthroughLabels(labels: unknown): ExtrasState {
  const base: ExtrasState = {
    baseboard: false,
    patio: false,
    walls: false,
    stairs: false,
    cabinetInside: false,
    cabinetOutside: false,
    washDishes: false,
    hallways: false,
    basement: false,
  };
  if (!Array.isArray(labels)) return base;
  for (const raw of labels) {
    const label = typeof raw === "string" ? raw : "";
    const key = RESIDENTIAL_EXTRA_LABEL_TO_KEY[label];
    if (key) base[key] = true;
  }
  return base;
}

/** Residential row shape from `residential_walkthrough_data` (subset) */
export type ResidentialWalkthroughRow = {
  service_type?: string | null;
  square_footage?: string | null;
  bedrooms?: string | null;
  kitchen?: string | null;
  living_room?: string | null;
  dining_room?: string | null;
  office?: string | null;
  full_bath?: string | null;
  half_bath?: string | null;
  fans?: string | null;
  oven?: string | null;
  refrigerator?: string | null;
  blinds?: string | null;
  windows_inside?: string | null;
  windows_outside?: string | null;
  extra_services?: unknown;
  has_pets?: string | null;
  notes?: string | null;
};

/** Commercial row shape from `commercial_walkthrough_data` (subset) */
export type CommercialWalkthroughRow = {
  property_type?: string | null;
  property_size?: string | null;
  service_type?: string | null;
  service_schedule?: string | null;
  grease_level?: string | null;
  restaurant_condition?: string | null;
  extra_services?: unknown;
  recurring_frequency?: string | null;
  selected_week_days?: unknown;
  employee_count?: string | null;
  hourly_rate?: string | null;
  cleaning_duration?: string | null;
  start_time?: string | null;
  client_provides_supplies?: boolean | null;
  notes?: string | null;
};

function hasTrimmed(v: string | null | undefined): boolean {
  return v != null && String(v).trim() !== "";
}

function setIntIfPresent(out: Record<string, unknown>, key: string, v: string | null | undefined) {
  if (!hasTrimmed(v)) return;
  out[key] = parseIntSafe(v);
}

export function mapResidentialWalkthroughRowToPrefillFields(row: ResidentialWalkthroughRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (row.service_type) {
    const mapped = RESIDENTIAL_SERVICE_WALKTHROUGH_TO_ESTIMATE[row.service_type];
    if (mapped) out.selectedService = mapped;
  }
  if (hasTrimmed(row.square_footage)) {
    out.squareFootage = String(row.square_footage).trim();
  }

  setIntIfPresent(out, "bedrooms", row.bedrooms);
  setIntIfPresent(out, "kitchens", row.kitchen);
  setIntIfPresent(out, "livingRooms", row.living_room);
  setIntIfPresent(out, "diningRooms", row.dining_room);
  setIntIfPresent(out, "offices", row.office);
  setIntIfPresent(out, "fullBaths", row.full_bath);
  setIntIfPresent(out, "halfBaths", row.half_bath);

  setIntIfPresent(out, "fans", row.fans);
  setIntIfPresent(out, "oven", row.oven);
  setIntIfPresent(out, "refrigerator", row.refrigerator);
  setIntIfPresent(out, "blinds", row.blinds);
  setIntIfPresent(out, "windowsInside", row.windows_inside);
  setIntIfPresent(out, "windowsOutside", row.windows_outside);

  const ex = extrasFromWalkthroughLabels(row.extra_services);
  if (Object.values(ex).some(Boolean)) out.extras = ex;

  if (hasTrimmed(row.has_pets)) {
    const hp = String(row.has_pets).trim().toLowerCase();
    if (hp === "yes" || hp === "y") out.pets = "yes";
    else if (hp === "no" || hp === "n") out.pets = "no";
  }

  if (hasTrimmed(row.notes)) {
    out.scope = String(row.notes).trim();
  }

  return out;
}

function asStringArray(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}

export function mapCommercialWalkthroughRowToPrefillFields(row: CommercialWalkthroughRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (hasTrimmed(row.property_type)) {
    const label = String(row.property_type).trim();
    const slug = COMMERCIAL_PROPERTY_WALKTHROUGH_TO_ESTIMATE[label];
    if (slug) {
      out.propertyType = slug;
      out.isOtherProperty = false;
      out.otherPropertyType = "";
    } else {
      out.propertyType = "";
      out.isOtherProperty = true;
      out.otherPropertyType = label;
    }
  }

  if (row.property_size != null && String(row.property_size).trim() !== "") {
    out.propertySize = String(row.property_size).trim();
  }

  const st = row.service_type?.trim();
  if (st === "one-time") out.serviceType = "one-time";
  else if (st === "recurring") out.serviceType = "recurrent";

  if (row.recurring_frequency != null && String(row.recurring_frequency).trim() !== "") {
    out.recurringFrequency = String(row.recurring_frequency).trim();
  }

  const days = asStringArray(row.selected_week_days);
  if (days.length > 0) out.selectedWeekDays = days;

  if (row.client_provides_supplies === true || row.client_provides_supplies === false) {
    out.clientProvidesSupplies = row.client_provides_supplies;
  }

  if (row.service_schedule != null && String(row.service_schedule).trim() !== "") {
    out.serviceSchedule = String(row.service_schedule).trim();
  }
  if (row.grease_level != null && String(row.grease_level).trim() !== "") {
    out.greaseLevel = String(row.grease_level).trim();
  }
  if (row.restaurant_condition != null && String(row.restaurant_condition).trim() !== "") {
    out.restaurantCondition = String(row.restaurant_condition).trim();
  }

  const extras = asStringArray(row.extra_services);
  if (extras.length > 0) out.extraServices = extras;

  const ec = parseIntSafe(row.employee_count);
  if (ec > 0) out.employeeCount = ec;

  if (row.hourly_rate != null && String(row.hourly_rate).trim() !== "") {
    out.hourlyRate = String(row.hourly_rate).trim();
  }

  const cd = parseFloatSafe(row.cleaning_duration);
  if (cd > 0) out.cleaningDuration = cd;

  if (row.start_time != null && String(row.start_time).trim() !== "") {
    out.startTime = String(row.start_time).trim();
  }

  if (row.notes != null && String(row.notes).trim() !== "") {
    out.scopeDetails = String(row.notes).trim();
  }

  return out;
}

export interface WalkthroughEstimatePrefill extends Record<string, unknown> {
  walkthrough_id: string;
  contact_name: string;
  client_id: string | null;
  lead_id: string | null;
}

/**
 * Builds full navigation `state.prefill` for estimate creation from a walkthrough
 * and optional completed on-site data rows.
 */
export function mergeWalkthroughEstimatePrefill(
  w: WalkthroughWithContact,
  mappedFields: Record<string, unknown>,
): WalkthroughEstimatePrefill {
  return {
    walkthrough_id: w.id,
    contact_name: w.contact_name,
    client_id: w.client_id,
    lead_id: w.lead_id,
    ...mappedFields,
  };
}
