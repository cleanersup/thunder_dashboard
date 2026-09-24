/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module useSendInvoiceReminder
 * Sends a payment reminder for a pending invoice via the `send-invoice-reminders`
 * edge function, then marks `reminder_sent` on the invoice.
 * Mirrors swift-slate InvoiceDetails reminder action.
 */
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { markReminderSent } from "../services/invoicesService";

/**
 * Returns a `sendReminder` function and an `isSending` loading flag.
 */
export function useSendInvoiceReminder() {
  const [isSending, setIsSending] = useState(false);
  const qc = useQueryClient();

  const sendReminder = async (
    invoiceId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-invoice-reminders", {
        body: { invoiceId },
      });
      if (error) throw error;

      await markReminderSent(invoiceId);
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.invoice(invoiceId) });

      toast.success("The payment reminder has been emailed to the client successfully.");
      return { success: true };
    } catch (err: any) {
      const message: string = err?.message ?? "Failed to send reminder email.";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsSending(false);
    }
  };

  return { sendReminder, isSending };
}
