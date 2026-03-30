/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addEstimateActivity } from "../services/estimatesService";

interface SendEstimateEmailParams {
  estimateData:   Record<string, any>;
  recipientEmail: string;
  estimateType:   "residential" | "commercial";
}

/**
 * Sends an estimate email via the `send-estimate-email` Supabase Edge Function.
 * Validates the email, calls the function, and logs activity on success.
 * @returns sendEstimateEmail function and isSending boolean
 */
export function useSendEstimateEmail() {
  const [isSending, setIsSending] = useState(false);

  const sendEstimateEmail = async ({
    estimateData,
    recipientEmail,
    estimateType,
  }: SendEstimateEmailParams) => {
    setIsSending(true);
    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        toast.error("Invalid email address");
        return { success: false, error: "Invalid email" };
      }

      const sanitizedEmail = recipientEmail.trim().toLowerCase();

      const { data, error } = await supabase.functions.invoke("send-estimate-email", {
        body: { estimateData, recipientEmail: sanitizedEmail, estimateType },
      });

      if (error) {
        if (error.message?.includes("bounce") || error.message?.includes("invalid")) {
          toast.error(`Email ${sanitizedEmail} appears to be invalid or does not exist`);
          return { success: false, error: "Email invalid or does not exist" };
        }
        throw error;
      }

      // Log activity
      await addEstimateActivity(
        "estimate_sent",
        estimateData.id?.slice(0, 6) ? `EST-${estimateData.id.slice(0, 6)}` : "N/A",
        estimateData.client_name || "Unknown",
        estimateData.total ?? 0,
      );

      return { success: true, data, recipientEmail: sanitizedEmail };
    } catch (err: any) {
      console.error("Error sending estimate email:", err);
      return { success: false, error: err.message || "Failed to send estimate email" };
    } finally {
      setIsSending(false);
    }
  };

  return { sendEstimateEmail, isSending };
}
