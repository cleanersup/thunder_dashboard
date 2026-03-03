import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchBookings, fetchBooking,
  updateBookingStatus, deleteBooking,
  convertBookingToLead, convertBookingToClient,
  fetchBookingForms, saveBookingForms,
  fetchPublicProfile, fetchPublicBookingForms,
} from "../services/bookingService";
import type { CustomQuestion } from "../types/booking.types";

// ─── Internal hooks ───────────────────────────────────────────────────────────

export function useBookings() {
  return useQuery({ queryKey: ["bookings"], queryFn: fetchBookings });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn:  () => fetchBooking(id!),
    enabled:  !!id,
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateBookingStatus(id, "cancelled"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking cancelled");
    },
    onError: () => toast.error("Failed to cancel booking"),
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking deleted");
    },
    onError: () => toast.error("Failed to delete booking"),
  });
}

export function useConvertToLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: convertBookingToLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Booking moved to CRM as a lead");
    },
    onError: () => toast.error("Failed to convert booking to lead"),
  });
}

export function useConvertToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: convertBookingToClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Booking converted to client");
    },
    onError: () => toast.error("Failed to convert booking to client"),
  });
}

// ─── Booking form editor hooks ────────────────────────────────────────────────

export function useBookingForms() {
  return useQuery({ queryKey: ["booking-forms"], queryFn: fetchBookingForms });
}

export function useSaveBookingForms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: CustomQuestion[]) => saveBookingForms(questions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-forms"] });
      toast.success("Booking form saved");
    },
    onError: () => toast.error("Failed to save booking form"),
  });
}

// ─── Public hooks (no auth) ───────────────────────────────────────────────────

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey:  ["public-profile", userId],
    queryFn:   () => fetchPublicProfile(userId!),
    enabled:   !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicBookingForms(userId: string | undefined) {
  return useQuery({
    queryKey:  ["public-booking-forms", userId],
    queryFn:   () => fetchPublicBookingForms(userId!),
    enabled:   !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
