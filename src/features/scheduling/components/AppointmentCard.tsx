import { Clock, User } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { formatTime } from "../utils/appointmentHelpers";
import type { AppointmentWithClient } from "../types/scheduling.types";

interface AppointmentCardProps {
  appointment: AppointmentWithClient;
  onClick: (appointment: AppointmentWithClient) => void;
  compact?: boolean;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};


export function AppointmentCard({ appointment, onClick, compact = false }: AppointmentCardProps) {
  const startTime = formatTime(appointment.scheduled_time);
  const endTime = formatTime(appointment.end_time);
  const timeRange = startTime
    ? endTime
      ? `${startTime} – ${endTime}`
      : startTime
    : "";

  const statusLabel = appointment.status;
  const statusClass =
    statusStyles[appointment.status] ?? "bg-gray-100 text-gray-800";

  return (
    <button
      onClick={() => onClick(appointment)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3 hover:bg-accent/30 transition-colors",
        compact && "p-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
              {appointment.clients?.full_name ?? "Unknown client"}
            </p>
          </div>

          {timeRange && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">{timeRange}</p>
            </div>
          )}

          {!compact && appointment.service_type && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {appointment.service_type}
            </p>
          )}
        </div>

        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0", statusClass)}>
          {statusLabel}
        </span>
      </div>
    </button>
  );
}
