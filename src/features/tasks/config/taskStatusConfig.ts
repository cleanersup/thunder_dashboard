/**
 * @module taskStatusConfig
 * Estados de una task y sus colores — espejo de `jobStatusConfig` para jobs.
 *
 * Existían sueltos dentro de `TaskDetailModal`, así que cada pantalla que quisiera
 * pintar un estado los reescribía. Aquí viven una sola vez, sobre las variables
 * `--task-status-*` del tema, para que la tabla, el detalle y el calendario
 * coincidan.
 */
import type { Task } from "../types/task.types";

/**
 * Los tres estados que guarda la base, más `overdue`, que **no se guarda**: se
 * deriva de la fecha igual que `getEffectiveJobStatus` deriva "Today" en jobs.
 * Por eso el backend no necesita una columna nueva para esto.
 */
export type EffectiveTaskStatus = "to do" | "in progress" | "completed" | "overdue";

export const TASK_STATUS_LABEL: Record<EffectiveTaskStatus, string> = {
  "to do":       "To Do",
  "in progress": "In Progress",
  "completed":   "Completed",
  "overdue":     "Overdue",
};

/** Color del texto/relleno sólido. */
export const TASK_STATUS_COLOR: Record<EffectiveTaskStatus, string> = {
  "to do":       "hsl(var(--info))",
  "in progress": "hsl(var(--task-status-progress))",
  "completed":   "hsl(var(--task-status-completed))",
  // Vencido comparte el rojo de `Missed` en jobs: es la misma idea.
  "overdue":     "hsl(var(--destructive))",
};

export const TASK_STATUS_BG: Record<EffectiveTaskStatus, string> = {
  "to do":       "hsl(var(--info) / 0.15)",
  "in progress": "hsl(var(--task-status-progress) / 0.15)",
  "completed":   "hsl(var(--task-status-completed) / 0.15)",
  "overdue":     "hsl(var(--destructive) / 0.15)",
};

export const TASK_STATUS_BORDER: Record<EffectiveTaskStatus, string> = {
  "to do":       "hsl(var(--info) / 0.3)",
  "in progress": "hsl(var(--task-status-progress) / 0.3)",
  "completed":   "hsl(var(--task-status-completed) / 0.3)",
  "overdue":     "hsl(var(--destructive) / 0.3)",
};

/**
 * Píldora de la tabla y del detalle. Vivía en `shared/constants/styleTokens`
 * como `TASK_STATUS_SOFT`, separada de los colores de arriba, así que cada uno
 * podía cambiar sin el otro. Aquí van juntos y solo lo usan las tasks.
 */
export const TASK_STATUS_SOFT: Record<EffectiveTaskStatus, string> = {
  "to do":       "bg-task-status-todo/15      text-task-status-todo      border-task-status-todo/30",
  "in progress": "bg-task-status-progress/15  text-task-status-progress  border-task-status-progress/30",
  "completed":   "bg-task-status-completed/15 text-task-status-completed border-task-status-completed/30",
  "overdue":     "bg-destructive/15 text-destructive border-destructive/30",
};

/**
 * Estado real de una task en este momento.
 *
 * Una task con fecha pasada que no está completada está vencida, se haya tocado
 * o no. Se calcula aquí y no en la base porque depende de "hoy": guardarlo
 * obligaría a un proceso que repasara todas las filas cada noche.
 *
 * @param task - La task a evaluar
 * @param dueDate - Fecha contra la que medir; por defecto `due_date` de la task.
 *                  Se puede pasar `start_date` cuando exista esa columna.
 */
export function getEffectiveTaskStatus(
  task: Pick<Task, "status" | "due_date">,
  dueDate?: string | null,
): EffectiveTaskStatus {
  const status = (task.status ?? "to do") as EffectiveTaskStatus;
  if (status === "completed") return "completed";

  const ref = dueDate ?? task.due_date;
  if (ref) {
    // Fecha local en formato yyyy-MM-dd, para comparar sin husos horarios.
    const today = new Date().toLocaleDateString("en-CA");
    if (ref < today) return "overdue";
  }
  return status;
}
