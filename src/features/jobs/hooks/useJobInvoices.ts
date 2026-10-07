import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";

export interface JobInvoiceSummary {
  id:             string;
  invoice_number: string;
  invoice_name:   string | null;
  status:         string;
  total:          number;
}

export function useJobInvoices(invoiceIds: string[], depositInvoiceId?: string | null) {
  const { data: invoices = [], ...rest } = useQuery({
    queryKey: QK.jobInvoices(invoiceIds),
    queryFn: async () => {
      if (invoiceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_name, status, total")
        .in("id", invoiceIds);
      if (error) throw error;
      return (data ?? []) as JobInvoiceSummary[];
    },
    enabled: invoiceIds.length > 0,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const depositInvoice = invoices.find((inv) => inv.id === depositInvoiceId) ?? null;

  return { invoices, depositInvoice, ...rest };
}
