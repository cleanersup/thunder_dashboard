/**
 * @module invoiceCalculations
 * Pure utility functions for invoice pricing calculations.
 * Single source of truth — used by CreateInvoicePage, InvoicesPage, InvoiceDetailsModal.
 */
import type { LineItem } from "../types/invoice.types";

export interface InvoiceTotalsResult {
  subtotal:       number;
  discountAmount: number;
  taxAmount:      number;
  total:          number;
}

/**
 * Calculate invoice totals from line items, discount, and tax.
 *
 * @param lineItems     - Array of items with a `total` field (price × qty)
 * @param discountType  - "percentage" | "fixed" | null
 * @param discountValue - Numeric discount amount (percentage or fixed dollar)
 * @param taxRate       - Tax percentage (e.g. 8.5 for 8.5%)
 */
/**
 * Safely parses the `line_items` JSON column from any invoice record.
 *
 * Handles three real-world shapes that exist in the database:
 *   1. Modern app  → { description, price, qty, total }          (numbers)
 *   2. Legacy iOS  → { description, price, qty, total }          (strings)
 *   3. Old iOS     → { description, unit_price, quantity, total } (strings or numbers)
 *
 * Returns `{ items, error }`. When `error` is non-null the caller should display
 * the message to the user rather than attempting to render the items.
 */
export function safeParseLineItems(raw: unknown): { items: LineItem[]; error: string | null } {
  try {
    if (raw === null || raw === undefined) return { items: [], error: null };

    if (!Array.isArray(raw)) {
      return {
        items: [],
        error: "Line items data is in an unexpected format and could not be displayed.",
      };
    }

    const items: LineItem[] = raw.map((entry: unknown, idx: number) => {
      if (typeof entry !== "object" || entry === null) {
        throw new Error(`Item at index ${idx} is not a valid object.`);
      }

      const r = entry as Record<string, unknown>;

      // Support both {price, qty} and {unit_price, quantity} schemas
      const rawPrice = r.price  ?? r.unit_price;
      const rawQty   = r.qty    ?? r.quantity;
      const rawTotal = r.total;

      const price = Number(rawPrice);
      const qty   = Number(rawQty);
      const total = Number(rawTotal);

      const description =
        typeof r.description === "string" ? r.description.trim() : `Item ${idx + 1}`;

      if (!isFinite(price) || !isFinite(qty) || !isFinite(total)) {
        throw new Error(
          `Item "${description}" has non-numeric price, qty, or total.`,
        );
      }

      return {
        description,
        price: price || 0,
        qty:   qty   || 1,
        total: total || 0,
      };
    });

    return { items, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      items: [],
      error: `Could not load line items: ${msg}`,
    };
  }
}

function normalizeDiscountType(type: string | null | undefined): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t === "percent" || t === "percentage") return "percentage";
  if (t === "fixed" || t === "amount") return "fixed";
  return type;
}

export function calculateInvoiceTotals(params: {
  lineItems:      { total: number }[];
  discountType?:  string | null;
  discountValue?: number | null;
  taxRate?:       number | null;
}): InvoiceTotalsResult {
  const { lineItems, discountType: rawType, discountValue = 0, taxRate = 0 } = params;
  const discountType = normalizeDiscountType(rawType);

  const subtotal       = lineItems.reduce((s, i) => s + i.total, 0);
  // Percentage discount applies to the positive services subtotal only — negative
  // adjustments (e.g. a "Deposit Paid" credit line) are applied AFTER the discount.
  const discountBase   = lineItems.reduce((s, i) => s + (i.total > 0 ? i.total : 0), 0);
  const discountAmount = discountType === "percentage"
    ? discountBase * ((discountValue ?? 0) / 100)
    : (discountValue ?? 0);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount     = afterDiscount * ((taxRate ?? 0) / 100);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total: afterDiscount + taxAmount,
  };
}
