/**
 * @module useInvoices
 * React Query hooks for invoice CRUD operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  updateInvoice,
  markInvoiceAsPaid,
  chargeInvoiceSavedCard,
  cancelInvoice,
  markReminderSent,
  deleteInvoice,
} from "../services/invoicesService";
import type { InvoiceFilters, InvoiceFormData, Invoice } from "../types/invoice.types";
import { QK } from "@/shared/config/queryKeys";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Query hook — fetch all invoices with optional filtering.
 *
 * @param filters - Optional filters (status, search, date)
 */
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [...QK.invoices, filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: 30_000,
  });
}

/**
 * Query hook — fetch a single invoice by ID.
 * Designed for both authenticated and public pages.
 *
 * @param id - Invoice UUID (undefined = skip)
 */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: QK.invoice(id!),
    queryFn: () => fetchInvoiceById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mutation hook — create a new invoice.
 */
export function useCreateInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      invoiceNumber,
      formData,
      status,
    }: {
      userId: string;
      invoiceNumber: string;
      formData: InvoiceFormData;
      status?: "Draft" | "Pending";
    }) => createInvoice(userId, invoiceNumber, formData, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.invoices });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook — update an existing invoice.
 */
export function useUpdateInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Invoice, "id" | "user_id" | "created_at">>;
    }) => updateInvoice(id, updates),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.invoice(data.id) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook — mark invoice as Paid.
 */
export function useMarkInvoiceAsPaid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      paymentMethod,
      chequeNumber,
    }: {
      id: string;
      paymentMethod: "Cash" | "Cheque";
      chequeNumber?: string;
    }) => markInvoiceAsPaid(id, paymentMethod, chequeNumber),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.invoice(data.id) });
      qc.invalidateQueries({ queryKey: QK.notifications });
      qc.invalidateQueries({ queryKey: QK.activities });
      toast.success("Invoice marked as paid");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useChargeInvoiceSavedCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chargeInvoiceSavedCard(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.invoice(id) });
      qc.invalidateQueries({ queryKey: QK.clients });
      qc.invalidateQueries({ queryKey: ["client-by-email"] });
      toast.success("Invoice paid with card on file");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not charge card on file");
    },
  });
}

/**
 * Mutation hook — cancel an invoice.
 */
export function useCancelInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelInvoice(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.invoice(data.id) });
      qc.invalidateQueries({ queryKey: QK.notifications });
      qc.invalidateQueries({ queryKey: QK.activities });
      toast.success("Invoice cancelled");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook — mark reminder as sent.
 */
export function useMarkReminderSent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markReminderSent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.invoices });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook — delete an invoice.
 */
export function useDeleteInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.invoices });
      toast.success("Invoice deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
