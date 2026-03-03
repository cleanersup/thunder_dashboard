/**
 * @module invoiceCalculations
 * Pure utility functions for invoice pricing calculations.
 * Single source of truth — used by CreateInvoicePage, InvoicesPage, InvoiceDetailsModal.
 */

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
export function calculateInvoiceTotals(params: {
  lineItems:      { total: number }[];
  discountType?:  string | null;
  discountValue?: number | null;
  taxRate?:       number | null;
}): InvoiceTotalsResult {
  const { lineItems, discountType, discountValue = 0, taxRate = 0 } = params;

  const subtotal       = lineItems.reduce((s, i) => s + i.total, 0);
  const discountAmount = discountType === "percentage"
    ? subtotal * ((discountValue ?? 0) / 100)
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
