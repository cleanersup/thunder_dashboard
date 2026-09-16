import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRequests, fetchRequest, updateRequest, deleteRequest,
  archiveRequest, cancelRequest, restoreRequest,
  fetchRequestForms, saveRequestForms,
} from "../services/requestsService";
import type { RequestPayload } from "../types/request.types";
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

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RequestPayload }) => updateRequest(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.requests });
      qc.invalidateQueries({ queryKey: QK.request(id) });
      toast.success("Request updated");
    },
    onError: () => toast.error("Failed to update request"),
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request cancelled");
    },
    onError: () => toast.error("Failed to cancel request"),
  });
}

export function useArchiveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request archived");
    },
    onError: () => toast.error("Failed to archive request"),
  });
}

export function useRestoreRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request reactivated");
    },
    onError: () => toast.error("Failed to restore request"),
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
