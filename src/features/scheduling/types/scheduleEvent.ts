/**
 * @module scheduleEvent
 * Evento del calendario — el único tipo que `SchedulingCalendar` entiende.
 *
 * El calendario no sabe qué es un job, una task ni una cita de ruta: recibe
 * eventos. Cada feature aporta su conversor (`jobToEvent`, `taskToEvent`,
 * `appointmentToEvent`) y así una misma rejilla sirve para las tres, que es lo
 * que permite pintarlas juntas en Schedule.
 */
import { type Job, getEffectiveJobStatus } from "@/features/jobs/types/job.types";
import {
  JOB_STATUS_COLOR, JOB_STATUS_BG, JOB_STATUS_BORDER,
} from "@/features/jobs/config/jobStatusConfig";
import { type Task } from "@/features/tasks/types/task.types";
import {
  TASK_STATUS_COLOR, TASK_STATUS_BG, TASK_STATUS_BORDER, TASK_STATUS_LABEL,
  getEffectiveTaskStatus, type EffectiveTaskStatus,
} from "@/features/tasks/config/taskStatusConfig";
import type { AppointmentWithClient } from "./scheduling.types";

export type ScheduleEventType = "job" | "task" | "appointment";

/** Evento unificado del calendario. */
export interface ScheduleEvent {
  /** Clave única en la rejilla ("job-<id>"). */
  id: string;
  type: ScheduleEventType;
  /** Id de la entidad, para abrir su panel de detalle. */
  refId: string;
  /** Día de inicio, "yyyy-MM-dd". */
  date: string;
  /**
   * Día de fin cuando el evento ocupa varios días. `null` si empieza y acaba
   * el mismo día, que es el caso normal.
   */
  endDate: string | null;
  /** "HH:mm". Sin hora, el evento va a la banda de "todo el día". */
  startTime: string | null;
  endTime: string | null;
  title: string;
  subtitle: string | null;
  /** Estado ya resuelto (incluye los derivados: "Today", "overdue"). */
  status: string | null;
  address: string | null;
  /** Empleados asignados — el "crew" de esta parada. */
  crew: string[];
  /** Identificador visible del documento ("J-0051"). */
  code: string | null;
  phone: string | null;
  email: string | null;
  /** Importe total. `null` cuando la entidad no maneja dinero, como las tasks. */
  amount: number | null;
}

/** Colores de un evento, tomados de la config de estados de su entidad. */
export interface EventPalette {
  color: string;
  bg: string;
  border: string;
}

/**
 * Paleta rotatoria para entidades sin estado. Las citas de ruta no tienen uno,
 * así que conservan el color estable por identificador que Routes ya usaba —
 * si no, todas saldrían del mismo gris y el calendario perdería legibilidad.
 */
const ROTATING = [
  "hsl(330 81% 60%)", "hsl(38 92% 50%)",  "hsl(173 58% 39%)", "hsl(217 91% 60%)",
  "hsl(271 76% 53%)", "hsl(25 95% 53%)",  "hsl(142 71% 45%)", "hsl(350 89% 60%)",
  "hsl(239 84% 67%)", "hsl(189 94% 43%)",
];

function rotatingColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i);
    h |= 0;
  }
  return ROTATING[Math.abs(h) % ROTATING.length];
}

const NEUTRAL: EventPalette = {
  color:  "hsl(var(--muted-foreground))",
  bg:     "hsl(var(--muted-foreground) / 0.1)",
  border: "hsl(var(--muted-foreground) / 0.3)",
};

/**
 * Color del bloque según el estado — **los mismos que usan las tablas**, para
 * que un job verde en la lista sea verde en el calendario.
 */
export function eventPalette(e: ScheduleEvent): EventPalette {
  if (e.type === "appointment") {
    const c = rotatingColor(e.refId);
    return { color: c, bg: c, border: c };
  }
  if (!e.status) return NEUTRAL;

  if (e.type === "job") {
    const s = e.status as keyof typeof JOB_STATUS_COLOR;
    if (!JOB_STATUS_COLOR[s]) return NEUTRAL;
    return { color: JOB_STATUS_COLOR[s], bg: JOB_STATUS_BG[s], border: JOB_STATUS_BORDER[s] };
  }

  if (e.type === "task") {
    const s = e.status as EffectiveTaskStatus;
    if (!TASK_STATUS_COLOR[s]) return NEUTRAL;
    return { color: TASK_STATUS_COLOR[s], bg: TASK_STATUS_BG[s], border: TASK_STATUS_BORDER[s] };
  }

  return NEUTRAL;
}

/** Un evento sin hora ocupa el día entero; uno de varios días, también. */
export function isAllDay(e: ScheduleEvent): boolean {
  return !e.startTime || (!!e.endDate && e.endDate !== e.date);
}

/** ¿El evento cubre este día? Tiene en cuenta los de varios días. */
export function coversDate(e: ScheduleEvent, day: string): boolean {
  if (!e.endDate || e.endDate === e.date) return e.date === day;
  return day >= e.date && day <= e.endDate;
}

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);

// ─── Conversores ──────────────────────────────────────────────────────────────

export function jobToEvent(job: Job): ScheduleEvent {
  const address = [job.propertyStreet, job.propertyCity, job.propertyState, job.propertyZip]
    .filter(Boolean)
    .join(", ");
  return {
    id: `job-${job.id}`,
    type: "job",
    refId: job.id,
    date: job.jobDate,
    endDate: null,
    startTime: job.startTime || null,
    endTime: job.endTime || null,
    title: job.clientName || "Job",
    subtitle: cap(job.serviceType),
    status: getEffectiveJobStatus(job),
    address: address || null,
    crew: job.employeeIds ?? [],
    code: job.jobNumber ? `J-${job.jobNumber}` : null,
    phone: job.clientPhone ?? null,
    email: job.clientEmail ?? null,
    amount: job.total ?? null,
  };
}

/**
 * Una task se agenda con `start_date`/`end_date` y su franja horaria. `due_date`
 * queda de respaldo: las tasks anteriores a esas columnas solo tienen eso, y sin
 * el respaldo desaparecerían del calendario.
 */
export function taskToEvent(task: Task): ScheduleEvent {
  const start = task.start_date ?? task.due_date ?? "";
  const effective = getEffectiveTaskStatus(task, start);

  return {
    id: `task-${task.id}`,
    type: "task",
    refId: task.id,
    date: start,
    endDate: task.end_date ?? null,
    startTime: task.start_time ?? null,
    endTime: task.end_time ?? null,
    title: task.title,
    subtitle: cap(task.priority) ? `${cap(task.priority)} priority` : null,
    status: effective,
    address: null,
    crew: Array.isArray(task.assigned_employees)
      ? (task.assigned_employees as { id?: string }[]).map((e) => e?.id ?? "").filter(Boolean)
      : [],
    code: null,
    phone: null,
    email: null,
    // Una task no factura: la tarjeta omite la línea de importe.
    amount: null,
  };
}

/**
 * Cita de ruta. Routes desaparecerá, pero mientras exista comparte el mismo
 * calendario, así que convierte igual que las demás entidades.
 */
export function appointmentToEvent(a: AppointmentWithClient): ScheduleEvent {
  const c = a.clients;
  const address = c
    ? [c.service_street, c.service_city, c.service_state, c.service_zip].filter(Boolean).join(", ")
    : "";
  return {
    id: `appt-${a.id}`,
    type: "appointment",
    refId: a.id,
    date: a.scheduled_date,
    endDate: null,
    startTime: a.scheduled_time || null,
    endTime: a.end_time || null,
    title: c?.full_name ?? "Client",
    subtitle: a.routes?.name ?? null,
    status: null,
    address: address || null,
    crew: [],
    code: null,
    phone: c?.phone ?? null,
    email: c?.email ?? null,
    amount: null,
  };
}

/** Etiqueta legible del estado, para la tarjeta de detalle. */
export function eventStatusLabel(e: ScheduleEvent): string | null {
  if (!e.status) return null;
  if (e.type === "task") return TASK_STATUS_LABEL[e.status as EffectiveTaskStatus] ?? e.status;
  return e.status;
}
