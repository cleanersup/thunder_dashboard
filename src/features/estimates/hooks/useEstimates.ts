import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEstimates,
  fetchEstimate,
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  deleteEstimate,
  addEstimateActivity,
  addEstimateNotification,
} from "../services/estimatesService";
import type { EstimateInsert, EstimateUpdate } from "../types/estimate.types";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all estimates for the authenticated user.
 * @returns React Query result with estimates array
 */
export function useEstimates() {
  return useQuery({
    queryKey:     QK.estimates,
    queryFn:      fetchEstimates,
    staleTime:    2 * 60 * 1000, // 2 minutes
    refetchOnMount: "always",
  });
}

/**
 * Fetches a single estimate by ID.
 * @param id - The estimate UUID (pass null to skip)
 */
export function useEstimate(id: string | null) {
  return useQuery({
    queryKey:  QK.estimate(id!),
    queryFn:   () => fetchEstimate(id!),
    enabled:   !!id,
    staleTime: 60 * 1000,
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
      await addEstimateActivity("estimate_created", estimateNumber, estimate.client_name, estimate.total);
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
          await addEstimateActivity("estimate_accepted", estimateNumber, estimate.client_name, estimate.total);
          await addEstimateNotification(
            user.id,
            "estimate_accepted",
            "Estimate Accepted",
            `Estimate ${estimateNumber} for ${estimate.client_name} was accepted ($${estimate.total.toFixed(2)})`,
            id,
          );
        } else if (status === "Canceled") {
          await addEstimateActivity("estimate_canceled", estimateNumber, estimate.client_name, estimate.total);
          await addEstimateNotification(
            user.id,
            "estimate_canceled",
            "Estimate Canceled",
            `Estimate ${estimateNumber} for ${estimate.client_name} was canceled`,
            id,
          );
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.estimates });
      toast.success("Estimate deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete estimate"),
  });
}
