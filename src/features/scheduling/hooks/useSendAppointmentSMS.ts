/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendAppointmentSMSParams {
  appointmentId: string;
  isUpdate?:     boolean;
}

/**
 * Sends appointment details via SMS (to client + assigned employees)
 * using the `send-appointment-sms` Supabase Edge Function.
 * The Edge Function fetches all data server-side (client, employees, profile).
 */
export function useSendAppointmentSMS() {
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  const sendAppointmentSMS = async ({
    appointmentId,
    isUpdate,
  }: SendAppointmentSMSParams): Promise<{ success: boolean; error?: string }> => {
    setIsSendingSMS(true);
    try {
      const { error } = await supabase.functions.invoke("send-appointment-sms", {
        body: { appointmentId, isUpdate },
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      toast.error("Failed to send appointment SMS. Please try again.");
      return { success: false, error: err.message ?? "Failed to send appointment SMS" };
    } finally {
      setIsSendingSMS(false);
    }
  };

  return { sendAppointmentSMS, isSendingSMS };
}
