import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchClients, fetchClient, createClient, updateClient, deleteClient } from "../services/clientsService";
import type { ClientInsert, ClientUpdate } from "../../types/crm.types";

export function useClients() {
  return useQuery({ queryKey: ["clients"], queryFn: fetchClients });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => fetchClient(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<ClientInsert, "user_id">) => createClient(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
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
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", id] });
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
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted");
    },
    onError: () => toast.error("Failed to delete client"),
  });
}
