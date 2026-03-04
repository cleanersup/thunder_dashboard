import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendAppointmentEmailParams {
  appointmentId: string;
  isUpdate?: boolean;
}

/**
 * Sends appointment confirmation email (to client + assigned employees)
 * using the `send-appointment-emails` Supabase Edge Function.
 * The Edge Function fetches all data server-side (client, employees, profile).
 */
export function useSendAppointmentEmail() {
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const sendAppointmentEmail = async ({
    appointmentId,
    isUpdate,
  }: SendAppointmentEmailParams): Promise<{ success: boolean; error?: string }> => {
    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-appointment-emails", {
        body: { appointmentId, isUpdate },
      });

      if (error) throw error;

      return { success: true };
    } catch (err: any) {
      console.error("Error sending appointment email:", err);
      toast.error("Failed to send appointment email. Please try again.");
      return { success: false, error: err.message ?? "Failed to send appointment email" };
    } finally {
      setIsSendingEmail(false);
    }
  };

  return { sendAppointmentEmail, isSendingEmail };
}
