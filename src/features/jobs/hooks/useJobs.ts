import { useQuery } from "@tanstack/react-query";
import { jobsService } from "../services/jobsService";
import { QK } from "@/shared/config/queryKeys";

export function useJobs() {
  return useQuery({
    queryKey: QK.jobs,
    queryFn:  jobsService.fetchAll,
    staleTime: 30 * 1000,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: QK.job(id!),
    queryFn:  () => jobsService.fetchById(id!),
    enabled:  !!id,
    staleTime: 30 * 1000,
  });
}
