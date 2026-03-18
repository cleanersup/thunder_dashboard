/**
 * @module invoicesService
 * CRUD operations for the invoices table via Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Invoice, InvoiceFilters, InvoiceFormData } from "../types/invoice.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate the next sequential invoice number for the authenticated user.
 * Format: INV-YYYY-NNN (e.g. INV-2025-001)
 *
 * @returns Promise<string> The next invoice number
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `INV-${year}-%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const last = data[0].invoice_number;
    const parts = last.split("-");
    const lastNum = parseInt(parts[2] ?? "0", 10);
    nextNum = lastNum + 1;
  }

  return `INV-${year}-${String(nextNum).padStart(3, "0")}`;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all invoices for the current user, with optional filtering.
 *
 * @param filters - Optional status, search, and date filters
 * @returns Promise<Invoice[]>
 */
export async function fetchInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  let query = supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "All") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("client_name", `%${filters.search}%`);
  }

  if (filters?.date) {
    query = query.eq("invoice_date", filters.date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

/**
 * Fetch a single invoice by ID (public access — no auth required).
 *
 * @param id - Invoice UUID
 * @returns Promise<Invoice>
 */
export async function fetchInvoiceById(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Invoice;
}

/**
 * Fetch invoice by ID for the public payment page. Mirrors fetchEstimateByToken:
 * fetches the invoice and marks it as viewed if not already.
 * Use this when the client opens the invoice via email/SMS link.
 *
 * @param id - Invoice UUID
 * @returns Promise<Invoice>
 */
export async function fetchInvoiceByIdForPublic(id: string): Promise<Invoice> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!invoice) throw new Error("Invoice not found");

  return invoice as Invoice;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Insert a new invoice record.
 *
 * @param userId - Authenticated user UUID
 * @param invoiceNumber - Pre-generated invoice number (INV-YYYY-NNN)
 * @param formData - Collected form fields
 * @param status - Initial status ("Draft" | "Pending")
 * @returns Promise<Invoice> The created invoice
 */
export async function createInvoice(
  userId: string,
  invoiceNumber: string,
  formData: InvoiceFormData,
  status: "Draft" | "Pending" = "Draft"
): Promise<Invoice> {
  const discountValue = parseFloat(formData.discountValue) || 0;
  const taxRate       = parseFloat(formData.taxRate) || 0;

  const subtotal = formData.lineItems.reduce((s, i) => s + i.total, 0);
  const discountAmount =
    formData.discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountValue;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount     = afterDiscount * (taxRate / 100);
  const total         = afterDiscount + taxAmount;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id:        userId,
      invoice_number: invoiceNumber,
      invoice_name:   formData.invoiceName || null,
      invoice_date:   formData.invoiceDate,
      due_date:       formData.dueDate,
      service_type:   formData.serviceType,
      status,
      client_name:    formData.clientName,
      company_name:   formData.companyName || null,
      email:          formData.email,
      phone:          formData.phone,
      address:        formData.address,
      apt:            formData.apt || null,
      city:           formData.city,
      state:          formData.state,
      zip:            formData.zip,
      line_items:     formData.lineItems as unknown as any,
      discount_type:  discountValue > 0 ? formData.discountType : null,
      discount_value: discountValue > 0 ? discountValue : null,
      tax_rate:       taxRate > 0 ? taxRate : null,
      total,
      notes:          formData.notes || null,
      attachments:    formData.attachments.length > 0
        ? (formData.attachments as unknown as any)
        : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing invoice's fields.
 *
 * @param id - Invoice UUID
 * @param updates - Partial invoice fields to update
 * @returns Promise<Invoice>
 */
export async function updateInvoice(
  id: string,
  updates: Partial<Omit<Invoice, "id" | "user_id" | "created_at">>
): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    // Cast updates to `any` to bridge our typed Invoice fields and Supabase's Json columns
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

/**
 * Mark an invoice as Paid.
 *
 * @param id - Invoice UUID
 * @param paymentMethod - "Cash" | "Cheque"
 * @param chequeNumber - Required when paymentMethod is "Cheque"
 * @returns Promise<Invoice>
 */
export async function markInvoiceAsPaid(
  id: string,
  paymentMethod: "Cash" | "Cheque",
  chequeNumber?: string
): Promise<Invoice> {
  return updateInvoice(id, {
    status:         "Paid",
    payment_method: paymentMethod,
    cheque_number:  chequeNumber ?? null,
    paid_date:      new Date().toISOString().split("T")[0],
  });
}

/**
 * Mark an invoice as Cancelled.
 *
 * @param id - Invoice UUID
 * @returns Promise<Invoice>
 */
export async function cancelInvoice(id: string): Promise<Invoice> {
  return updateInvoice(id, { status: "Cancelled" });
}

/**
 * Record that the invoice email was resent (reminder).
 *
 * @param id - Invoice UUID
 * @returns Promise<Invoice>
 */
export async function markReminderSent(id: string): Promise<Invoice> {
  return updateInvoice(id, { reminder_sent: true });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete an invoice by ID (typically draft invoices only).
 *
 * @param id - Invoice UUID
 * @returns Promise<void>
 */
export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
