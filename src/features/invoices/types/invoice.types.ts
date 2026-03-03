/**
 * @module invoice.types
 * TypeScript types for the Invoices feature.
 */

export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Cancelled";

export type DiscountType = "percentage" | "fixed";

export interface LineItem {
  description: string;
  price: number;
  qty: number;
  total: number;
}

export interface InvoiceAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  invoice_name: string | null;
  invoice_date: string;
  due_date: string;
  service_type: string;
  status: InvoiceStatus;
  client_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  address: string;
  apt: string | null;
  city: string;
  state: string;
  zip: string;
  line_items: LineItem[] | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  tax_rate: number | null;
  total: number;
  notes: string | null;
  attachments: InvoiceAttachment[] | null;
  payment_method: string | null;
  cheque_number: string | null;
  paid_date: string | null;
  viewed_at: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

/** Derived totals computed on the client from line_items + discount + tax */
export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | "All";
  search?: string;
  date?: string;
}

/** Stats for the KPI cards at the top of InvoicesPage */
export interface InvoiceStats {
  pendingCount: number;
  pendingTotal: number;
  paidCount: number;
  paidTotal: number;
  draftCount: number;
  draftTotal: number;
  cancelledCount: number;
  cancelledTotal: number;
}

/** Form state for CreateInvoicePage */
export interface InvoiceFormData {
  serviceType: string;
  invoiceDate: string;
  dueDate: string;
  invoiceName: string;
  clientId: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  lineItems: LineItem[];
  discountType: DiscountType;
  discountValue: string;
  taxRate: string;
  notes: string;
  attachments: InvoiceAttachment[];
}
