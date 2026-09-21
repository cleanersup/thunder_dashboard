import { useQuery } from "@tanstack/react-query";
import { fetchPublicProfile, fetchPublicBookingForms } from "../services/bookingService";
import { QK } from "@/shared/config/queryKeys";

// ─── Public hooks (no auth) ───────────────────────────────────────────────────
// La gestión interna de bookings vive en `features/requests`; aquí solo queda lo
// que consume el formulario público (`/booking/:userId`).

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
