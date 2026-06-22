import { Badge } from "@/shared/components/ui/badge";
import { JOB_STATUS_BADGE, JOB_STATUS_ICON } from "../config/jobStatusConfig";
import { getEffectiveJobStatus } from "../types/job.types";
import type { Job, JobStatus } from "../types/job.types";
import { cn } from "@/shared/utils/cn";

interface JobStatusBadgeProps {
  status: JobStatus | Job["status"];
  job?: Job;
  size?: "sm" | "md";
}

export function JobStatusBadge({ status, job, size = "md" }: JobStatusBadgeProps) {
  const effective = job ? getEffectiveJobStatus(job) : (status as JobStatus);
  const badgeClass = JOB_STATUS_BADGE[effective] ?? "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1 border",
        badgeClass,
        size === "sm" && "text-xs px-1.5 py-0",
      )}
    >
      {JOB_STATUS_ICON[effective]}
      {effective}
    </Badge>
  );
}
