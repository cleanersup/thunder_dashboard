/**
 * @module useRoutes
 * React Query hooks for routes CRUD.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "../services/routesService";
import { QK } from "@/shared/config/queryKeys";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useRoutes() {
  return useQuery({
    queryKey: QK.routes,
    queryFn: fetchRoutes,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createRoute(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.routes });
      // Success feedback is handled by the caller (RouteSuccessModal)
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateRoute(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.routes });
      toast.success("Route renamed");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.routes });
      qc.invalidateQueries({ queryKey: QK.appointments });
      toast.success("Route deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
