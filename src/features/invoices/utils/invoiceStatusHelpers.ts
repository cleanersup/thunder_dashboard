import type { InvoiceStatus } from "../types/invoice.types";

/** Badge classes for the invoices table (bg + text + border). */
export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  Draft:     "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  Pending:   "bg-orange-500/15 text-orange-700 border-orange-500/30",
  Paid:      "bg-green-500/15 text-green-700 border-green-500/30",
  Cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

/** CSS color strings — used for inline `color` / `borderColor` styling. */
export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  Draft:     "hsl(45 93% 42%)",
  Pending:   "hsl(var(--orange-vibrant))",
  Paid:      "hsl(var(--green-vibrant))",
  Cancelled: "hsl(var(--destructive))",
};

/** CSS background color strings — used for inline `backgroundColor` styling. */
export const INVOICE_STATUS_BG: Record<InvoiceStatus, string> = {
  Draft:     "hsl(45 93% 47% / 0.15)",
  Pending:   "hsl(var(--orange-vibrant) / 0.1)",
  Paid:      "hsl(var(--green-vibrant) / 0.1)",
  Cancelled: "hsl(var(--destructive) / 0.1)",
};

/** CSS border-left color strings — used for KPI card accents. */
export const INVOICE_STATUS_BORDER: Record<InvoiceStatus, string> = {
  Draft:     "hsl(45 93% 42%)",
  Pending:   "hsl(var(--orange-vibrant))",
  Paid:      "hsl(var(--green-vibrant))",
  Cancelled: "hsl(var(--destructive))",
};
