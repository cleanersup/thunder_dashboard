import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/shared/hooks/useAuth";
import { QK } from "@/shared/config/queryKeys";

/**
 * Subscribes to INSERT / UPDATE / DELETE on the invoices table for the
 * authenticated user and invalidates the invoices list query on any change.
 * Use in the invoices list page.
 */
export function useInvoicesListRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel("invoices-list-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "invoices", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: QK.invoices }))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);
}

/**
 * Subscribes to UPDATE on a single invoice row and invalidates its detail
 * query when it changes. Use in the invoice detail modal.
 *
 * @param invoiceId - Invoice UUID; pass null/undefined to skip subscription
 * @param open      - Whether the modal is currently open
 */
export function useInvoiceDetailRealtime(invoiceId: string | null | undefined, open: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!invoiceId || !open) return;

    const ch = supabase
      .channel(`invoice-detail-${invoiceId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices", filter: `id=eq.${invoiceId}` },
        () => queryClient.invalidateQueries({ queryKey: QK.invoice(invoiceId) }))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [invoiceId, open, queryClient]);
}
