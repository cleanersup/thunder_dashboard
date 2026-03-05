import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchLeads, fetchLead, createLead, updateLead, deleteLead } from "../services/leadsService";
import type { LeadInsert, LeadUpdate } from "../../types/crm.types";
import { QK } from "@/shared/config/queryKeys";

export function useLeads() {
  return useQuery({ queryKey: QK.leads, queryFn: fetchLeads });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: QK.lead(id!),
    queryFn: () => fetchLead(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<LeadInsert, "user_id">) => createLead(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.leads });
      toast.success("Lead created successfully");
    },
    onError: () => toast.error("Failed to create lead"),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeadUpdate }) => updateLead(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.leads });
      qc.invalidateQueries({ queryKey: QK.lead(id) });
      toast.success("Lead updated successfully");
    },
    onError: () => toast.error("Failed to update lead"),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.leads });
      toast.success("Lead deleted");
    },
    onError: () => toast.error("Failed to delete lead"),
  });
}
