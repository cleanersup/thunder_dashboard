import { useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, parseISO, startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { formatDisplayDate, formatDisplayTime } from "@/shared/utils/formatters";
import { useJobs } from "@/features/jobs/hooks/useJobs";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { JobDetailPanel } from "@/features/jobs/components/JobDetailPanel";
import { TaskDetailModal } from "@/features/tasks/components/TaskDetailModal";
import type { TaskWithClient } from "@/features/tasks/types/task.types";
import { EVENT_COLORS, jobToEvent, taskToEvent, type ScheduleEvent } from "../types/scheduleEvent";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SchedulePage() {
  const { data: jobs = [] }  = useJobs();
  const { data: tasks = [] } = useTasks();

  const [month, setMonth]               = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [openJobId, setOpenJobId]       = useState<string | null>(null);
  const [openTask, setOpenTask]         = useState<TaskWithClient | null>(null);

  // Mapa refId → task para abrir el modal de detalle sin refetch.
  const taskById = useMemo(() => {
    const m = new Map<string, TaskWithClient>();
    (tasks as TaskWithClient[]).forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const eventsByDate = useMemo(() => {
    const list: ScheduleEvent[] = [
      ...jobs.map(jobToEvent),
      ...(tasks as TaskWithClient[]).map(taskToEvent),
    ].filter((e) => e.date);

    const m = new Map<string, ScheduleEvent[]>();
    list.forEach((e) => {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    });
    // Jobs primero por hora de inicio; tasks (sin hora) al final.
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
    }
    return m;
  }, [jobs, tasks]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  );

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const openEvent = (e: ScheduleEvent) => {
    if (e.type === "job") setOpenJobId(e.refId);
    else {
      const t = taskById.get(e.refId);
      if (t) setOpenTask(t);
    }
  };

  return (
    <div className="p-2.5 space-y-2.5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Schedule</h1>
            <span className="text-sm text-muted-foreground">Jobs and tasks on a calendar</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Leyenda */}
            <div className="flex items-center gap-3">
              {(["job", "task"] as const).map((type) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS[type].dot)} />
                  {EVENT_COLORS[type].label}
                </div>
              ))}
            </div>
            {/* Navegación de mes */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[9rem] text-center text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="ml-1 h-8" onClick={() => setMonth(startOfMonth(new Date()))}>
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-2.5">
        {/* ── Calendario ───────────────────────────────────────────────── */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1.5 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
              {days.map((day) => {
                const key      = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const inMonth  = isSameMonth(day, month);
                const selected = key === selectedDate;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "min-h-[4.5rem] rounded-md border p-1 text-left align-top transition-colors",
                      inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                      selected ? "border-primary ring-1 ring-primary" : "border-border/50 hover:bg-secondary/50",
                    )}
                  >
                    <span className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground font-semibold",
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] leading-tight"
                          onClick={(ev) => { ev.stopPropagation(); openEvent(e); }}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", EVENT_COLORS[e.type].dot)} />
                          <span className="truncate">{e.startTime ? `${formatDisplayTime(e.startTime)} ` : ""}{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="px-1 text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Lista del día seleccionado ───────────────────────────────── */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Selected day</p>
              <p className="text-sm font-semibold">{formatDisplayDate(parseISO(selectedDate))}</p>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No jobs or tasks scheduled.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => openEvent(e)}
                    className="w-full flex items-start gap-2.5 rounded-lg border border-border/50 p-2.5 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <span className={cn("mt-1 w-2.5 h-2.5 rounded-full shrink-0", EVENT_COLORS[e.type].dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.startTime ? `${formatDisplayTime(e.startTime)}${e.endTime ? ` – ${formatDisplayTime(e.endTime)}` : ""} · ` : ""}
                        {e.subtitle ?? EVENT_COLORS[e.type].label}
                      </p>
                    </div>
                    {e.status && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{e.status}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Detalle inline ───────────────────────────────────────────────── */}
      <JobDetailPanel
        jobId={openJobId}
        open={openJobId !== null}
        onClose={() => setOpenJobId(null)}
        onUpdated={() => setOpenJobId(null)}
      />
      <TaskDetailModal
        task={openTask}
        open={openTask !== null}
        onClose={() => setOpenTask(null)}
      />
    </div>
  );
}
