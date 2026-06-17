import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRequests, fetchRequest,
  updateRequestStatus, deleteRequest,
  convertRequestToLead, convertRequestToClient,
  fetchRequestForms, saveRequestForms,
  fetchPublicProfile, fetchPublicBookingForms,
} from "../services/requestsService";
import type { CustomQuestion } from "../types/request.types";
import { QK } from "@/shared/config/queryKeys";

// ─── Internal hooks ───────────────────────────────────────────────────────────

export function useRequests() {
  return useQuery({ queryKey: QK.requests, queryFn: fetchRequests });
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: QK.request(id!),
    queryFn:  () => fetchRequest(id!),
    enabled:  !!id,
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateRequestStatus(id, "cancelled"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request cancelled");
    },
    onError: () => toast.error("Failed to cancel request"),
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request deleted");
    },
    onError: () => toast.error("Failed to delete request"),
  });
}

export function useConvertToLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: convertRequestToLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      qc.invalidateQueries({ queryKey: QK.leads });
      toast.success("Request moved to CRM as a lead");
    },
    onError: () => toast.error("Failed to convert request to lead"),
  });
}

export function useConvertToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: convertRequestToClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      qc.invalidateQueries({ queryKey: QK.clients });
      toast.success("Request converted to client");
    },
    onError: () => toast.error("Failed to convert request to client"),
  });
}

// ─── Request form editor hooks ────────────────────────────────────────────────

export function useRequestForms() {
  return useQuery({ queryKey: QK.requestForms, queryFn: fetchRequestForms });
}

export function useSaveRequestForms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: CustomQuestion[]) => saveRequestForms(questions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requestForms });
      toast.success("Request form saved");
    },
    onError: () => toast.error("Failed to save request form"),
  });
}

// ─── Public hooks (no auth) ───────────────────────────────────────────────────

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey:  QK.publicProfile(userId!),
    queryFn:   () => fetchPublicProfile(userId!),
    enabled:   !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicBookingForms(userId: string | undefined) {
  return useQuery({
    queryKey:  QK.publicBooking(userId!),
    queryFn:   () => fetchPublicBookingForms(userId!),
    enabled:   !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
