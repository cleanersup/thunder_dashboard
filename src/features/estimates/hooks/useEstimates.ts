import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEstimates,
  fetchEstimate,
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  deleteEstimate,
} from "../services/estimatesService";
import type { EstimateInsert, EstimateUpdate } from "../types/estimate.types";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { logEstimateActivity } from "@/shared/services/activityLog";
import { createNotification } from "@/features/notifications/services/notificationsService";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all estimates for the authenticated user.
 * @returns React Query result with estimates array
 */
export function useEstimates() {
  return useQuery({
    queryKey:        QK.estimates,
    queryFn:         fetchEstimates,
    staleTime:       0,
    refetchOnMount:  "always",
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetches a single estimate by ID.
 * @param id - The estimate UUID (pass null to skip)
 */
export function useEstimate(id: string | null, options?: { staleTime?: number }) {
  return useQuery({
    queryKey:  QK.estimate(id!),
    queryFn:   () => fetchEstimate(id!),
    enabled:   !!id,
    staleTime: options?.staleTime ?? 60 * 1000,
    retry: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new estimate, logs activity, and invalidates the estimates cache.
 */
export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<EstimateInsert, "user_id">) => {
      const estimate = await createEstimate(payload);
      const estimateNumber = `EST-${estimate.id.slice(0, 6)}`;
      await logEstimateActivity("estimate_created", estimateNumber, estimate.client_name, estimate.total);
      return estimate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.estimates });
      qc.invalidateQueries({ queryKey: QK.activities });
      toast.success("Estimate created successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create estimate"),
  });
}

/**
 * Updates an estimate and invalidates the estimates cache.
 */
export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: EstimateUpdate }) =>
      updateEstimate(id, update),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.estimates });
      qc.invalidateQueries({ queryKey: QK.estimate(id) });
      toast.success("Estimate updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update estimate"),
  });
}

/**
 * Updates estimate status and logs activity + notification.
 */
export function useUpdateEstimateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, estimate }: { id: string; status: string; estimate: { client_name: string; total: number } }) => {
      await updateEstimateStatus(id, status);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const estimateNumber = `EST-${id.slice(0, 6)}`;
        if (status === "Accepted") {
          await logEstimateActivity("estimate_accepted", estimateNumber, estimate.client_name, estimate.total);
          await createNotification({
            userId:      user.id,
            type:        "estimate_accepted",
            title:       "Estimate Accepted",
            message:     `Estimate ${estimateNumber} for ${estimate.client_name} was accepted ($${estimate.total.toFixed(2)})`,
            relatedId:   id,
            relatedType: "estimate",
          });
        } else if (status === "Canceled") {
          await logEstimateActivity("estimate_canceled", estimateNumber, estimate.client_name, estimate.total);
          await createNotification({
            userId:      user.id,
            type:        "estimate_canceled",
            title:       "Estimate Canceled",
            message:     `Estimate ${estimateNumber} for ${estimate.client_name} was canceled`,
            relatedId:   id,
            relatedType: "estimate",
          });
        }
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.estimates });
      qc.invalidateQueries({ queryKey: QK.estimate(id) });
      qc.invalidateQueries({ queryKey: QK.activities });
      qc.invalidateQueries({ queryKey: QK.notifications });
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update estimate status"),
  });
}

/**
 * Deletes an estimate and invalidates the estimates cache.
 */
export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEstimate,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.estimates });
      qc.invalidateQueries({ queryKey: QK.estimate(id) });
      toast.success("Estimate deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete estimate"),
  });
}
