/**
 * @module useAppointments
 * React Query hooks for route_appointments CRUD.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAppointments,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
} from "../services/appointmentsService";
import type {
  AppointmentFilters,
  AppointmentFormData,
  DeleteAppointmentMode,
} from "../types/scheduling.types";
import { QK } from "@/shared/config/queryKeys";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: [...QK.appointments, filters],
    queryFn: () => fetchAppointments(filters),
    staleTime: 30_000,
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: QK.appointment(id!),
    queryFn: () => fetchAppointment(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AppointmentFormData) => createAppointment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.appointments });
      toast.success("Appointment created");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) =>
      updateAppointment(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: QK.appointments });
      qc.invalidateQueries({ queryKey: QK.appointment(id) });
      toast.success("Appointment updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: DeleteAppointmentMode }) =>
      deleteAppointment(id, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.appointments });
      toast.success("Appointment deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAppointmentStatus(id, status),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: QK.appointments });
      qc.invalidateQueries({ queryKey: QK.appointment(id) });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
