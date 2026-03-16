import type { InvoiceStatus } from "../types/invoice.types";

/** Badge classes for the invoices table (bg + text + border). */
export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  Paid:      "bg-green-100 text-green-700 border-green-200",
  Pending:   "bg-orange-100 text-orange-700 border-orange-200",
  Draft:     "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

/** CSS color strings — used for inline `color` / `borderColor` styling. */
export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  Pending:   "hsl(var(--orange-vibrant))",
  Paid:      "hsl(var(--green-vibrant))",
  Draft:     "hsl(var(--muted-foreground))",
  Cancelled: "hsl(var(--destructive))",
};

/** CSS background color strings — used for inline `backgroundColor` styling. */
export const INVOICE_STATUS_BG: Record<InvoiceStatus, string> = {
  Pending:   "hsl(var(--orange-vibrant) / 0.1)",
  Paid:      "hsl(var(--green-vibrant) / 0.1)",
  Draft:     "hsl(var(--muted))",
  Cancelled: "hsl(var(--destructive) / 0.1)",
};

/** CSS border-left color strings — used for KPI card accents. */
export const INVOICE_STATUS_BORDER: Record<InvoiceStatus, string> = {
  Pending:   "hsl(var(--orange-vibrant))",
  Paid:      "hsl(var(--green-vibrant))",
  Draft:     "hsl(var(--blue-vibrant))",
  Cancelled: "hsl(var(--destructive))",
};
