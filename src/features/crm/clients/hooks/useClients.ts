import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchClients,
  fetchClient,
  createClient,
  updateClient,
  deleteClient,
  findClientByEmail,
  issueClientWalletLink,
  clearClientSavedCard,
} from "../services/clientsService";
import type { ClientInsert, ClientUpdate } from "../../types/crm.types";
import { QK } from "@/shared/config/queryKeys";

export function useClients() {
  return useQuery({ queryKey: QK.clients, queryFn: fetchClients });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: QK.client(id!),
    queryFn: () => fetchClient(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientByEmail(userId: string | undefined, email: string | undefined) {
  const normalizedEmail = email?.trim();

  return useQuery({
    queryKey: ["client-by-email", userId, normalizedEmail],
    queryFn: () => findClientByEmail(userId!, normalizedEmail!),
    enabled: !!userId && !!normalizedEmail,
    staleTime: 30_000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<ClientInsert, "user_id">) => createClient(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clients });
      toast.success("Client created successfully");
    },
    onError: () => toast.error("Failed to create client"),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientUpdate }) => updateClient(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.clients });
      qc.invalidateQueries({ queryKey: QK.client(id) });
      toast.success("Client updated successfully");
    },
    onError: () => toast.error("Failed to update client"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clients });
      toast.success("Client deleted");
    },
    onError: () => toast.error("Failed to delete client"),
  });
}

export function useIssueClientWalletLink() {
  return useMutation({
    mutationFn: issueClientWalletLink,
    onError: (err: Error) => toast.error(err.message || "Failed to create payment setup link"),
  });
}

export function useClearClientSavedCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: clearClientSavedCard,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QK.clients });
      qc.invalidateQueries({ queryKey: QK.client(data.id) });
      qc.invalidateQueries({ queryKey: ["client-by-email"] });
      toast.success("Saved card removed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove saved card"),
  });
}
