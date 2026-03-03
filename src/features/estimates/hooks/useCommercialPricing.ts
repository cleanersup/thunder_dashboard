/**
 * @module useCommercialPricing
 * Isolates all commercial estimate pricing calculations.
 * Mirrors the structure of useResidentialPricing for residential estimates.
 */
import { useMemo } from "react";
import { calculateAdjustedPrice } from "@/shared/utils/estimatePricing";

const GROUP_B_TYPES = ["restaurant", "food-truck"];
export const isGroupB = (propertyType: string) => GROUP_B_TYPES.includes(propertyType);

function getBaseRatePerSqft(propertyType: string, sqft: number): number {
  switch (propertyType) {
    case "office":          return sqft < 10000 ? 0.35 : sqft < 50000 ? 0.28 : 0.22;
    case "warehouse":       return sqft < 20000 ? 0.18 : sqft < 100000 ? 0.14 : 0.10;
    case "school":          return sqft < 30000 ? 0.45 : sqft < 80000 ? 0.35 : 0.28;
    case "bank":            return sqft < 5000  ? 0.50 : sqft < 15000 ? 0.38 : 0.30;
    case "clinic":          return sqft < 10000 ? 0.60 : sqft < 25000 ? 0.45 : 0.38;
    case "church":          return sqft < 10000 ? 0.35 : sqft < 30000 ? 0.25 : 0.18;
    case "hotel":           return sqft < 20000 ? 0.45 : sqft < 50000 ? 0.35 : 0.28;
    case "gym":             return sqft < 10000 ? 0.45 : sqft < 25000 ? 0.35 : 0.28;
    case "movie-theater":   return sqft < 20000 ? 0.40 : sqft < 50000 ? 0.30 : 0.22;
    case "auto-dealership": return sqft < 10000 ? 0.45 : sqft < 30000 ? 0.35 : 0.28;
    case "restaurant":
    case "food-truck":      return sqft < 1500 ? 0.75 : sqft < 3500 ? 0.65 : sqft < 7000 ? 0.40 : 0.55;
    default:                return 0.30;
  }
}

export interface CommercialPricingInput {
  propertyType:          string;
  propertySize:          string;
  serviceType:           "one-time" | "recurrent" | "";
  recurringFrequency:    string;
  selectedWeekDays:      string[];
  employeeCount:         number;
  hourlyRate:            string;
  cleaningDuration:      number;
  serviceSchedule:       string;
  greaseLevel:           string;
  restaurantCondition:   string;
  extraServices:         string[];
  clientProvidesSupplies: boolean;
  useCustomPrice:        boolean;
  customPrice:           string;
  applyDiscount:         boolean;
  discountType:          "percentage" | "amount";
  discountValue:         string;
  companyState?:         string;
}

export interface CommercialCostBreakdown {
  finalPrice:          number;
  laborCost:           number;
  suppliesCost:        number;
  overheadCost:        number;
  totalOperationCost:  number;
}

export interface CommercialPricingOutput {
  costs:    CommercialCostBreakdown;
  subtotal: number;
  total:    number;
}

function deriveCosts(finalPrice: number): CommercialCostBreakdown {
  const totalOperationCost = finalPrice * 0.60;
  const laborCost          = totalOperationCost * 0.75;
  const suppliesCost       = totalOperationCost * 0.0833;
  const overheadCost       = totalOperationCost * 0.1667;
  return { finalPrice, laborCost, suppliesCost, overheadCost, totalOperationCost };
}

function calcDetailedCosts(input: CommercialPricingInput): CommercialCostBreakdown {
  const {
    propertyType, propertySize, serviceType, recurringFrequency, selectedWeekDays,
    employeeCount, hourlyRate, cleaningDuration,
    serviceSchedule, greaseLevel, restaurantCondition, extraServices, clientProvidesSupplies,
    companyState,
  } = input;

  const groupB    = isGroupB(propertyType);
  const sqft      = parseInt(propertySize || "0", 10);
  const employees = employeeCount;
  const rate      = parseFloat(hourlyRate || "0");
  const duration  = cleaningDuration;

  const adjustPrice = (p: number) => companyState ? calculateAdjustedPrice(p, companyState) : p;

  if (serviceType === "one-time") {
    if (groupB) {
      let fp = sqft * 0.70;
      if (serviceSchedule === "nocturno") fp *= 1.25;
      if (greaseLevel === "medio") fp *= 1.15;
      else if (greaseLevel === "alto") fp *= 1.30;
      if (restaurantCondition === "sucio") fp *= 1.20;
      else if (restaurantCondition === "muy-sucio") fp *= 1.40;
      extraServices.forEach((s) => {
        if (s.includes("windows"))      fp += 150;
        if (s.includes("hoods"))        fp += 200;
        if (s.includes("refrigerators")) fp += 100;
      });
      if (clientProvidesSupplies) fp *= 0.97;
      return deriveCosts(adjustPrice(fp));
    }
    const ratePerSqft = getBaseRatePerSqft(propertyType, sqft);
    return deriveCosts(adjustPrice(sqft * ratePerSqft));
  }

  if (employees === 0 || rate === 0 || duration === 0) return deriveCosts(0);

  if (recurringFrequency === "once-per-week") {
    if (groupB) {
      const lc = employees * duration * rate * 4.2;
      const sc = lc * 0.06; const oc = lc * 0.03; const total = lc + sc + oc;
      return { finalPrice: adjustPrice(total * 2.20), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
    }
    const lc = employees * rate * duration * 4.2;
    const sc = lc * 0.09; const oc = lc * 0.06; const total = lc + sc + oc;
    return { finalPrice: adjustPrice(total + total * 0.38), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
  }
  if (recurringFrequency === "every-2-weeks") {
    if (groupB) {
      const lc = employees * rate * duration * 2;
      const sc = lc * 0.06; const oc = lc * 0.03; const total = lc + sc + oc;
      return { finalPrice: adjustPrice(total * 2.20), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
    }
    const lc = employees * rate * duration * 2;
    const sc = lc * 0.07; const oc = lc * 0.04; const total = lc + sc + oc;
    return { finalPrice: adjustPrice(total * 1.68), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
  }
  if (recurringFrequency === "every-3-weeks" || recurringFrequency === "once-per-month") {
    const lc   = employees * duration * rate * 1.3;
    const sc   = lc * 0.06; const oc = lc * 0.03; const total = lc + sc + oc;
    const mult = recurringFrequency === "once-per-month" ? (groupB ? 2.40 : 1.60) : (groupB ? 2.10 : 1.45);
    return { finalPrice: adjustPrice(total * mult), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
  }
  if (recurringFrequency === "multiple-per-week") {
    const days = selectedWeekDays.length;
    if (groupB) {
      const lc = days * employees * duration * 4.2 * rate;
      const sc = lc * 0.06; const oc = lc * 0.03; const total = lc + sc + oc;
      return { finalPrice: adjustPrice(total * 1.80), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
    }
    const lc = days * employees * duration * 4.2 * rate;
    const sc = lc * 0.10; const oc = lc * 0.04; const total = lc + sc + oc;
    return { finalPrice: adjustPrice(total * 1.46), laborCost: lc, suppliesCost: sc, overheadCost: oc, totalOperationCost: total };
  }

  return deriveCosts(0);
}

export function useCommercialPricing(input: CommercialPricingInput): CommercialPricingOutput {
  return useMemo(() => {
    const costs = calcDetailedCosts(input);

    const subtotal = input.useCustomPrice && input.customPrice
      ? parseFloat(input.customPrice)
      : costs.finalPrice;

    let total = subtotal;
    if (input.applyDiscount && input.discountValue) {
      const amount = input.discountType === "percentage"
        ? subtotal * (parseFloat(input.discountValue) / 100)
        : parseFloat(input.discountValue);
      total = Math.max(subtotal - amount, 0);
    }

    return { costs, subtotal, total };
  }, [
    input.propertyType, input.propertySize, input.serviceType, input.recurringFrequency,
    input.selectedWeekDays, input.employeeCount, input.hourlyRate, input.cleaningDuration,
    input.serviceSchedule, input.greaseLevel, input.restaurantCondition,
    input.extraServices, input.clientProvidesSupplies, input.companyState,
    input.useCustomPrice, input.customPrice, input.applyDiscount,
    input.discountType, input.discountValue,
  ]);
}
