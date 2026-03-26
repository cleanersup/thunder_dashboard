/**
 * @module useSendContractEmail
 * Hook to trigger the send-contract-email edge function.
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useSendContractEmail() {
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase.functions.invoke("send-contract-email", {
        body: { contractId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Contract sent via email");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to send contract email");
    },
  });
}
