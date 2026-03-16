import { useCallback } from "react";
import { toast } from "sonner";
import { useProfile } from "@/shared/hooks/useProfile";
import { formatDateOnly } from "@/shared/utils/formatters";
import { generateInvoicePDF } from "../services/generateInvoicePDF";
import { calculateInvoiceTotals } from "../utils/invoiceCalculations";
import type { Invoice, LineItem } from "../types/invoice.types";

/**
 * Returns a stable `downloadPDF(invoice)` callback that builds the PDF
 * using the authenticated user's company profile and triggers a browser download.
 *
 * Eliminates the identical `handleDownloadPDF` that was duplicated in
 * InvoicesPage and InvoiceDetailsModal.
 */
export function useInvoicePDFDownload() {
  const { data: profile } = useProfile();

  const downloadPDF = useCallback((invoice: Invoice) => {
    if (!profile) {
      toast.error("Company profile not loaded");
      return;
    }

    try {
      const lineItems: LineItem[] = invoice.line_items ?? [];
      const taxRate = invoice.tax_rate ?? 0;
      const { subtotal, discountAmount, taxAmount } = calculateInvoiceTotals({
        lineItems,
        discountType:  invoice.discount_type,
        discountValue: invoice.discount_value,
        taxRate,
      });

      const doc = generateInvoicePDF({
        companyLogo:    profile.company_logo   ?? undefined,
        companyName:    profile.company_name   ?? "",
        companyPhone:   profile.company_phone  ?? "",
        companyEmail:   profile.company_email  ?? "",
        companyStreet:  profile.company_address ?? "",
        companyCity:    profile.company_city   ?? "",
        companyState:   profile.company_state  ?? "",
        companyZip:     profile.company_zip    ?? "",
        clientName:     invoice.client_name,
        clientPhone:    invoice.phone,
        clientEmail:    invoice.email,
        invoiceNumber:  invoice.invoice_number,
        invoiceName:    invoice.invoice_name ?? undefined,
        invoiceDate:    formatDateOnly(invoice.invoice_date, "MMMM d, yyyy"),
        dueDate:        formatDateOnly(invoice.due_date, "MMMM d, yyyy"),
        status:         invoice.status,
        lineItems:      lineItems.map((i) => ({ ...i })),
        subtotal,
        taxRate,
        taxAmount,
        discountType:   invoice.discount_type  ?? undefined,
        discountValue:  invoice.discount_value ?? undefined,
        discountAmount,
        total:          invoice.total,
        notes:          invoice.notes ?? undefined,
      });

      doc.save(`Invoice_${invoice.invoice_number}.pdf`);
      toast.success("Invoice PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [profile]);

  return { downloadPDF };
}
