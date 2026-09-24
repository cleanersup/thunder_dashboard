import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientPropertyService } from "../services/clientPropertyService";
import type { ClientPropertyFormData, ClientPropertyContactFormData } from "../types/clientProperty.types";
import { QK } from "@/shared/config/queryKeys";

export function useClientProperties(clientId: string | undefined) {
  return useQuery({
    queryKey: QK.clientProperties(clientId ?? ""),
    queryFn:  () => clientPropertyService.getByClientId(clientId!),
    enabled:  !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateClientProperty(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ClientPropertyFormData) => clientPropertyService.create(clientId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
      toast.success("Property added");
    },
    onError: () => toast.error("Failed to add property"),
  });
}

export function useUpdateClientProperty(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: ClientPropertyFormData }) =>
      clientPropertyService.update(id, form, clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
      toast.success("Property updated");
    },
    onError: () => toast.error("Failed to update property"),
  });
}

export function useDeleteClientProperty(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientPropertyService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
      toast.success("Property deleted");
    },
    onError: () => toast.error("Failed to delete property"),
  });
}

export function useSetPrimaryClientProperty(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientPropertyService.setPrimary(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
    },
    onError: () => toast.error("Failed to set primary property"),
  });
}

export function useCreateClientPropertyContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, form }: { propertyId: string; form: ClientPropertyContactFormData }) =>
      clientPropertyService.createContact(propertyId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
    },
    onError: () => toast.error("Failed to add contact"),
  });
}

export function useUpdateClientPropertyContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: ClientPropertyContactFormData }) =>
      clientPropertyService.updateContact(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
    },
    onError: () => toast.error("Failed to update contact"),
  });
}

export function useDeleteClientPropertyContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientPropertyService.deleteContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.clientProperties(clientId) });
    },
    onError: () => toast.error("Failed to delete contact"),
  });
}
