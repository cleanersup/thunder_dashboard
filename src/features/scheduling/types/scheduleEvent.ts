import { type Job, getEffectiveJobStatus } from "@/features/jobs/types/job.types";
import { type Task } from "@/features/tasks/types/task.types";

export type ScheduleEventType = "job" | "task";

/** Evento unificado del calendario de Schedule (jobs + tasks). */
export interface ScheduleEvent {
  id: string;              // key única ("job-<id>" / "task-<id>")
  type: ScheduleEventType;
  refId: string;           // id del job/task para abrir el detalle
  date: string;            // "yyyy-MM-dd"
  startTime: string | null;
  endTime: string | null;
  title: string;
  subtitle: string | null;
  status: string | null;
  /** Dirección para referencia (solo jobs). */
  address: string | null;
}

/** Colores por tipo (un color para todos los jobs, otro para todas las tasks). */
export const EVENT_COLORS: Record<ScheduleEventType, { dot: string; hex: string; label: string }> = {
  job:  { dot: "bg-sky-500",   hex: "#0ea5e9", label: "Job" },
  task: { dot: "bg-amber-500", hex: "#f59e0b", label: "Task" },
};

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);

export function jobToEvent(job: Job): ScheduleEvent {
  const address = [job.propertyStreet, job.propertyCity, job.propertyState, job.propertyZip]
    .filter(Boolean)
    .join(", ");
  return {
    id: `job-${job.id}`,
    type: "job",
    refId: job.id,
    date: job.jobDate,
    startTime: job.startTime || null,
    endTime: job.endTime || null,
    title: job.clientName || "Job",
    subtitle: cap(job.serviceType),
    status: getEffectiveJobStatus(job),
    address: address || null,
  };
}

export function taskToEvent(task: Task): ScheduleEvent {
  return {
    id: `task-${task.id}`,
    type: "task",
    refId: task.id,
    date: task.due_date ?? "",
    startTime: null,
    endTime: null,
    title: task.title,
    subtitle: cap(task.priority) ? `${cap(task.priority)} priority` : null,
    status: cap(task.status),
    address: null,
  };
}
