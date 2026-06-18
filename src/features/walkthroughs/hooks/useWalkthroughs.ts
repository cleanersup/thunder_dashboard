import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchWalkthroughs,
  fetchWalkthrough,
  createWalkthrough,
  updateWalkthrough,
  updateWalkthroughStatus,
  deleteWalkthrough,
  fetchWalkthroughForForm,
  submitResidentialWalkthroughData,
  submitCommercialWalkthroughData,
  fetchAssignedEmployees,
  fetchCurrentUserId,
} from "../services/walkthroughsService";
import type {
  WalkthroughFormData,
} from "../schemas/walkthroughSchema";
import type {
  ResidentialWalkthroughData,
  CommercialWalkthroughData,
} from "../services/walkthroughsService";
import { QK } from "@/shared/config/queryKeys";

// ─── Read ─────────────────────────────────────────────────────────────────────

export function useWalkthroughs() {
  return useQuery({
    queryKey: QK.walkthroughs,
    queryFn:  fetchWalkthroughs,
    staleTime: 2 * 60 * 1000,
  });
}

export function useWalkthrough(id: string | undefined) {
  return useQuery({
    queryKey: QK.walkthrough(id!),
    queryFn:  () => fetchWalkthrough(id!),
    enabled:  Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function useCreateWalkthrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WalkthroughFormData) => createWalkthrough(data),
    onSuccess: (result) => {
      // Fire-and-forget confirmation notification
      void supabase.functions.invoke("send-walkthrough-confirmation", {
        body: { walkthroughId: result.id },
      });
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      toast.success("Walkthrough scheduled successfully");
    },
    onError: () => toast.error("Failed to schedule walkthrough"),
  });
}

export function useUpdateWalkthrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, newStatus }: { id: string; data: Partial<WalkthroughFormData>; newStatus?: string }) =>
      updateWalkthrough(id, data, newStatus),
    onSuccess: (_, { id }) => {
      // Fire-and-forget update notification
      void supabase.functions.invoke("send-walkthrough-update", {
        body: { walkthroughId: id },
      });
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      qc.invalidateQueries({ queryKey: QK.walkthrough(id) });
      toast.success("Walkthrough updated successfully");
    },
    onError: () => toast.error("Failed to update walkthrough"),
  });
}

export function useUpdateWalkthroughStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateWalkthroughStatus(id, status),
    onSuccess: (_, { id }) => {
      // Email/SMS: Postgres trigger → send-walkthrough-status-emails after status UPDATE
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      qc.invalidateQueries({ queryKey: QK.walkthrough(id) });
    },
    onError: () => toast.error("Failed to update walkthrough status"),
  });
}

export function useDeleteWalkthrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWalkthrough(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.walkthroughs });
      toast.success("Walkthrough deleted successfully");
    },
    onError: () => toast.error("Failed to delete walkthrough"),
  });
}

/**
 * Sends walkthrough start notifications (email + SMS fire-and-forget).
 * Invokes `send-walkthrough-start` and `send-walkthrough-start-sms` edge functions.
 */
export function useSendWalkthroughStart() {
  return useMutation({
    mutationFn: async (walkthroughId: string) => {
      await supabase.functions.invoke("send-walkthrough-start", { body: { walkthroughId } });
      void supabase.functions.invoke("send-walkthrough-start-sms", { body: { walkthroughId } });
    },
  });
}

// ─── Form data hooks ──────────────────────────────────────────────────────────

/** Fetches a walkthrough + its contact info for the on-site form pages. */
export function useWalkthroughForForm(id: string | undefined) {
  return useQuery({
    queryKey: QK.walkthroughForm(id!),
    queryFn:  () => fetchWalkthroughForForm(id!),
    enabled:  Boolean(id),
  });
}

export function useSubmitResidentialWalkthroughData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ walkthroughId, data }: { walkthroughId: string; data: ResidentialWalkthroughData }) =>
      submitResidentialWalkthroughData(walkthroughId, data),
    onSuccess: (_, { walkthroughId }) => {
      qc.invalidateQueries({ queryKey: QK.walkthroughForm(walkthroughId) });
    },
    onError: () => toast.error("Failed to save walkthrough data"),
  });
}

export function useSubmitCommercialWalkthroughData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ walkthroughId, data }: { walkthroughId: string; data: CommercialWalkthroughData }) =>
      submitCommercialWalkthroughData(walkthroughId, data),
    onSuccess: (_, { walkthroughId }) => {
      qc.invalidateQueries({ queryKey: QK.walkthroughForm(walkthroughId) });
    },
    onError: () => toast.error("Failed to save walkthrough data"),
  });
}

// ─── Employees hook ───────────────────────────────────────────────────────────

export function useWalkthroughEmployees(ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: [...QK.walkthroughEmployees, ids.join(",")],
    queryFn:  () => fetchAssignedEmployees(ids),
    enabled:  enabled && ids.length > 0,
  });
}

// ─── Current user id hook ─────────────────────────────────────────────────────

export function useCurrentUserId() {
  return useQuery({
    queryKey: QK.currentUserId,
    queryFn:  fetchCurrentUserId,
    staleTime: Infinity,
  });
}
