/**
 * @module useSendInvoiceEmail
 * Hook to send an invoice via email using the `send-invoice-email` Supabase edge function.
 * Mirrors swift-slate/src/hooks/useSendInvoiceEmail.tsx — adapted for web (no RevenueCat/Capacitor).
 */
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a `sendInvoiceEmail` function and an `isSending` loading flag.
 */
export function useSendInvoiceEmail() {
  const [isSending, setIsSending] = useState(false);

  /**
   * Invoke the `send-invoice-email` edge function for the given invoice.
   *
   * @param invoiceId - UUID of the invoice to email
   * @returns `{ success: true }` or `{ success: false, error: string }`
   */
  const sendInvoiceEmail = async (
    invoiceId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-invoice-email",
        { body: { invoiceId } }
      );

      if (error) throw error;
      if (!data) throw new Error("No response from email function");

      toast.success("Invoice sent successfully");
      return { success: true };
    } catch (err: any) {
      const message: string = err?.message ?? "Failed to send invoice email";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsSending(false);
    }
  };

  return { sendInvoiceEmail, isSending };
}
