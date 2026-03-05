import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Card, CardContent } from "@/shared/components/ui/card";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import type { TimeEntry } from "../types/timeClock.types";

interface Props {
  entries: TimeEntry[];
  isLoading: boolean;
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function ScheduledTab({ entries, isLoading }: Props) {
  const navigate = useNavigate();

  // Group by employee + date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const key = `${e.employee_id}_${e.date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center py-8 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 p-4">
        No scheduled shifts
      </p>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {Object.entries(grouped).map(([key, grpEntries]) => {
        const first = grpEntries[0];
        const emp   = first.employees;
        const appt  = first.route_appointments;

        return (
          <Card
            key={key}
            className="border border-border/50 shadow-none cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => {
              if (first.route_appointment_id) {
                navigate(`/create-route/${first.route_appointment_id}/edit`);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  {emp?.avatar_url && <AvatarImage src={emp.avatar_url} alt={emp.first_name} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(emp?.first_name ?? "", emp?.last_name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {emp?.first_name} {emp?.last_name}
                    </p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400">
                      Scheduled
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{emp?.position}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(first.date + "T00:00:00"), "EEE, MMM d")}
                    {appt?.scheduled_time && ` · ${format(new Date(appt.scheduled_time), "h:mm a")}`}
                    {appt?.end_time && ` – ${format(new Date(appt.end_time), "h:mm a")}`}
                  </p>
                  {appt?.clients?.full_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Client: {appt.clients.full_name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
