/**
 * @module useSendContractSMS
 * Hook to trigger the send-contract-sms edge function.
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useSendContractSMS() {
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.functions.invoke("send-contract-sms", {
        body: { contractId },
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
