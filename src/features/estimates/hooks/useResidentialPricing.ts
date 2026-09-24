/**
 * @module useResidentialPricing
 * Extracts all residential pricing calculations from CreateResidentialEstimatePage.
 * Pure derivation — no side-effects, no network calls.
 */
import {
  ROOM_PRICES,
  ADDITIONAL_SERVICE_PRICES,
  EXTRA_PRICES,
  PET_PRICES,
  LAUNDRY_PRICES,
  SERVICE_MODIFIERS,
  calculateAdjustedPrice,
} from "@/shared/utils/estimatePricing";

export interface ResidentialPricingInput {
  // Rooms
  bedrooms:    number;
  kitchens:    number;
  livingRooms: number;
  diningRooms: number;
  offices:     number;
  fullBaths:   number;
  halfBaths:   number;
  // Additional
  fans:           number;
  oven:           number;
  refrigerator:   number;
  blinds:         number;
  windowsInside:  number;
  windowsOutside: number;
  // Extras
  extras: {
    baseboard: boolean; patio: boolean; walls: boolean; stairs: boolean;
    cabinetInside: boolean; cabinetOutside: boolean; washDishes: boolean;
    hallways: boolean; basement: boolean;
  };
  // Pets / Laundry
  pets:           "yes" | "no" | null;
  laundryService: "wash-dry" | "wash-dry-fold" | null;
  laundryPounds:  number;
  // Service modifier
  selectedService: string;
  // State adjustment
  userState: string;
  // Custom price / discount
  useCustomPrice: boolean;
  customPrice:    string;
  applyDiscount:  boolean;
  discountType:   "percentage" | "amount";
  discountValue:  string;
}

export interface CrewPlan {
  crewSize: number;
  hours:    number;
  minutes:  number;
}

export interface ResidentialPricingOutput {
  basePrice:     number;
  subtotal:      number;
  total:         number;
  laborCost:     number;
  suppliesCost:  number;
  overheadCost:  number;
  totalOpCost:   number;
  netProfit:     number;
  crewPlanning:  CrewPlan;
}

export function useResidentialPricing(input: ResidentialPricingInput): ResidentialPricingOutput {
  const {
    bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
    fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
    extras, pets, laundryService, laundryPounds, selectedService, userState,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue,
  } = input;

  function calcBasePrice(): number {
    let t = 0;
    t += bedrooms    * ROOM_PRICES.bedrooms;
    t += kitchens    * ROOM_PRICES.kitchen;
    t += livingRooms * ROOM_PRICES.livingRoom;
    t += diningRooms * ROOM_PRICES.diningRoom;
    t += offices     * ROOM_PRICES.office;
    t += fullBaths   * ROOM_PRICES.fullBath;
    t += halfBaths   * ROOM_PRICES.halfBath;
    t += fans           * ADDITIONAL_SERVICE_PRICES.fans;
    t += oven           * ADDITIONAL_SERVICE_PRICES.oven;
    t += blinds         * ADDITIONAL_SERVICE_PRICES.blinds;
    t += refrigerator   * ADDITIONAL_SERVICE_PRICES.refrigerator;
    t += windowsInside  * ADDITIONAL_SERVICE_PRICES.windowsInside;
    t += windowsOutside * ADDITIONAL_SERVICE_PRICES.windowsOutside;
    if (extras.baseboard)      t += EXTRA_PRICES.baseboard;
    if (extras.patio)          t += EXTRA_PRICES.patio;
    if (extras.walls)          t += EXTRA_PRICES.walls;
    if (extras.stairs)         t += EXTRA_PRICES.stairs;
    if (extras.cabinetInside)  t += EXTRA_PRICES.cabinetInside;
    if (extras.cabinetOutside) t += EXTRA_PRICES.cabinetOutside;
    if (extras.washDishes)     t += EXTRA_PRICES.washDishes;
    if (extras.hallways)       t += EXTRA_PRICES.hallways;
    if (extras.basement)       t += EXTRA_PRICES.basement;
    if (pets === "yes")        t += PET_PRICES.pets;
    if (laundryService === "wash-dry")      t += laundryPounds * LAUNDRY_PRICES.washDry;
    if (laundryService === "wash-dry-fold") t += laundryPounds * LAUNDRY_PRICES.washDryFold;
    const mod = SERVICE_MODIFIERS[selectedService] ?? 1.0;
    t = t * mod;
    return calculateAdjustedPrice(t, userState);
  }

  function calcSubtotal(): number {
    if (useCustomPrice && customPrice && parseFloat(customPrice) > 0) return parseFloat(customPrice);
    return calcBasePrice();
  }

  function calcTotal(): number {
    let p = calcSubtotal();
    if (applyDiscount && discountValue && parseFloat(discountValue) > 0) {
      if (discountType === "percentage") p -= (p * parseFloat(discountValue)) / 100;
      else p -= parseFloat(discountValue);
    }
    return Math.max(0, p);
  }

  function calcCrewPlanning(subtotalVal: number): CrewPlan {
    let pts = 0;
    pts += bedrooms    * 10;
    pts += kitchens    * 12;
    pts += livingRooms * 8;
    pts += diningRooms * 6;
    pts += offices     * 6;
    pts += fullBaths   * 10;
    pts += halfBaths   * 5;
    pts += fans           * 2;
    pts += oven           * 4;
    pts += blinds         * 3;
    pts += refrigerator   * 4;
    pts += windowsInside  * 2;
    pts += windowsOutside * 3;
    if (extras.baseboard)      pts += 8;
    if (extras.patio)          pts += 10;
    if (extras.walls)          pts += 12;
    if (extras.stairs)         pts += 6;
    if (extras.cabinetInside)  pts += 5;
    if (extras.cabinetOutside) pts += 4;
    if (extras.washDishes)     pts += 7;
    if (extras.hallways)       pts += 5;
    if (extras.basement)       pts += 15;
    if (pets === "yes") pts += 8;
    if (laundryService) pts += Math.ceil(laundryPounds / 5) * 3;

    const laborHours = (subtotalVal * 0.45) / 17.50;
    const crewSize   = pts > 80 ? 3 : pts > 40 ? 2 : 1;
    const perPerson  = laborHours / crewSize;
    return { crewSize, hours: Math.floor(perPerson), minutes: Math.round((perPerson % 1) * 60) };
  }

  const basePrice    = calcBasePrice();
  const subtotal     = calcSubtotal();
  const total        = calcTotal();
  const laborCost    = subtotal * 0.45;
  const suppliesCost = subtotal * 0.05;
  const overheadCost = subtotal * 0.10;
  const totalOpCost  = subtotal * 0.60;
  const netProfit    = total - totalOpCost;
  const crewPlanning = calcCrewPlanning(subtotal);

  return { basePrice, subtotal, total, laborCost, suppliesCost, overheadCost, totalOpCost, netProfit, crewPlanning };
}
