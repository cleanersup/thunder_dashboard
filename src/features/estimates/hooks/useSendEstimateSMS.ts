import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEstimateSMSParams {
  phoneNumber:   string;
  clientName:    string;
  estimateId:    string;
  estimateTotal: number;
  isUpdate?:     boolean;
}

/**
 * Sends an estimate via SMS using the `send-estimate-sms` Supabase Edge Function.
 * Mirrors useSendEstimateEmail — SMS equivalent.
 */
export function useSendEstimateSMS() {
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const sendEstimateSMS = async ({
    phoneNumber,
    clientName,
    estimateId,
    estimateTotal,
    isUpdate,
  }: SendEstimateSMSParams): Promise<{ success: boolean; error?: string }> => {
    if (!phoneNumber) return { success: false, error: "No phone number" };

    setIsSendingSMS(true);
    try {
      const estimateUrl = `${window.location.origin}/estimate/${estimateId}`;

      const { error } = await supabase.functions.invoke("send-estimate-sms", {
        body: { phoneNumber, clientName, estimateUrl, estimateTotal, isUpdate },
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error("Error sending estimate SMS:", err);
      toast.error("Failed to send estimate via SMS. Please try again.");
      return { success: false, error: err.message ?? "Failed to send estimate SMS" };
    } finally {
      setIsSendingSMS(false);
    }
  };

  return { sendEstimateSMS, isSendingSMS };
}
