import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";

export function useJobInvoices(invoiceIds: string[]) {
  return useQuery({
    queryKey: QK.jobInvoices(invoiceIds),
    queryFn: async () => {
      if (invoiceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .in("id", invoiceIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: invoiceIds.length > 0,
    staleTime: 30 * 1000,
  });
}
