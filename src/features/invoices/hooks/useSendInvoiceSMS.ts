import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendInvoiceSMSParams {
  phoneNumber:  string;
  clientName:   string;
  invoiceId:    string;
  invoiceTotal: number;
  isUpdate?:    boolean;
}

/**
 * Sends an invoice via SMS using the `send-invoice-sms` Supabase Edge Function.
 * Mirrors useSendInvoiceEmail — SMS equivalent.
 */
export function useSendInvoiceSMS() {
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const sendInvoiceSMS = async ({
    phoneNumber,
    clientName,
    invoiceId,
    invoiceTotal,
    isUpdate,
  }: SendInvoiceSMSParams): Promise<{ success: boolean; error?: string }> => {
    if (!phoneNumber) return { success: false, error: "No phone number" };

    setIsSendingSMS(true);
    try {
      const invoiceUrl = `${window.location.origin}/invoice/payment/${invoiceId}`;

      const { error } = await supabase.functions.invoke("send-invoice-sms", {
        body: { phoneNumber, clientName, invoiceUrl, invoiceTotal, isUpdate },
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error("Error sending invoice SMS:", err);
      toast.error("Failed to send invoice via SMS. Please try again.");
      return { success: false, error: err.message ?? "Failed to send invoice SMS" };
    } finally {
      setIsSendingSMS(false);
    }
  };

  return { sendInvoiceSMS, isSendingSMS };
}
