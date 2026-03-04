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

const ROUTES_KEY = ["routes"] as const;
const APPOINTMENTS_KEY = ["appointments"] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useRoutes() {
  return useQuery({
    queryKey: ROUTES_KEY,
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
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
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
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
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
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
      toast.success("Route deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
