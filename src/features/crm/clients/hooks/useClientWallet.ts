import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import {
  fetchClientWalletPublic,
  createClientWalletSetupCheckout,
  issueClientWalletLink,
} from "../services/clientWalletService";

/** Public wallet page: load masked cards + merchant branding. */
export function usePublicClientWallet(token: string | undefined) {
  return useQuery({
    queryKey: token ? QK.publicClientWallet(token) : ["public-client-wallet", "none"],
    queryFn: () => fetchClientWalletPublic(token!),
    enabled: !!token && token.length >= 32,
    staleTime: 30_000,
  });
}

/** Redirect browser to Stripe Setup Checkout. */
export function useClientWalletSetupCheckout() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) => createClientWalletSetupCheckout(token),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Could not start card setup");
    },
  });
}

/** Merchant: create wallet link and copy to clipboard. */
export function useIssueClientWalletLink() {
  return useMutation({
    mutationFn: (clientId: string) => issueClientWalletLink(clientId),
    onSuccess: async (url) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Client wallet link copied to clipboard");
      } catch {
        toast.success("Link created", { description: url });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Could not create link");
    },
  });
}
