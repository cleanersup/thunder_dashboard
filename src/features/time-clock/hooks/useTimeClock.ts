import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QK } from "@/shared/config/queryKeys";
import {
  fetchTodayEntries,
  fetchScheduledEntries,
  fetchAllEntries,
  fetchEmployeeEntries,
  fetchPaidPeriods,
  markAsPaid,
} from "../services/timeClockService";

export function useTimeEntriesToday(date: string) {
  return useQuery({
    queryKey: QK.timeEntriesToday(date),
    queryFn:  () => fetchTodayEntries(date),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useTimeEntriesScheduled() {
  return useQuery({
    queryKey: QK.timeEntriesScheduled,
    queryFn:  fetchScheduledEntries,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useTimeEntriesAll(from: string, to: string) {
  return useQuery({
    queryKey: QK.timeEntriesAll(from, to),
    queryFn:  () => fetchAllEntries(from, to),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useEmployeeTimeEntries(empId: string, from: string, to: string) {
  return useQuery({
    queryKey: QK.timeEntriesEmployee(empId, from, to),
    queryFn:  () => fetchEmployeeEntries(empId, from, to),
    enabled:  Boolean(empId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function usePaidPeriods(empId: string) {
  return useQuery({
    queryKey: QK.paidPeriods(empId),
    queryFn:  () => fetchPaidPeriods(empId),
    enabled:  Boolean(empId),
    staleTime: 60_000,
  });
}

export function useMarkAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, startDate, endDate }: { empId: string; startDate: string; endDate: string }) =>
      markAsPaid(empId, startDate, endDate),
    onSuccess: (_data, { empId }) => {
      toast.success("Shifts marked as paid successfully");
      qc.invalidateQueries({ queryKey: QK.paidPeriods(empId) });
    },
    onError: () => toast.error("Failed to mark shifts as paid"),
  });
}
