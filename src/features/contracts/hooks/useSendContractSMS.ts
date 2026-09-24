/**
 * @module useSendContractSMS
 * Hook to trigger the send-contract-sms edge function.
 *
 * Expected payload matches the edge function interface:
 *   phoneNumber   — recipient's phone (normalized to +1 by the function)
 *   clientName    — recipient's name (used in the SMS body)
 *   contractUrl   — public contract view URL (/public/contract/:token)
 *   contractTotal — optional, included in the SMS body as ($XX.XX)
 *   isUpdate      — optional, changes SMS copy to "has been updated"
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SendContractSMSPayload {
  phoneNumber:    string;
  clientName:     string;
  contractUrl:    string;
  contractTotal?: number;
  isUpdate?:      boolean;
}

export function useSendContractSMS() {
  return useMutation({
    mutationFn: async (payload: SendContractSMSPayload) => {
      const { data, error } = await supabase.functions.invoke("send-contract-sms", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Contract sent via SMS");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to send contract SMS");
    },
  });
}
