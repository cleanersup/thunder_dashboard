/**
 * @module jobRecurrence
 * Opciones del bloque de repetición de un job.
 *
 * Copia exacta de `swift-slate/src/components/jobs/hub/jobFormOptions.ts`: las
 * dos aplicaciones escriben en las mismas columnas, así que si aquí se ofreciera
 * una frecuencia que allá no existe, un job creado en el dashboard no se podría
 * editar desde el móvil.
 */
import { addMonths } from "date-fns";
import type { RecurrenceFrequency, ServiceType } from "../types/job.types";

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
];

/**
 * Frecuencias del modelo nuevo. `every_two_weeks` sigue existiendo en el tipo
 * porque hay jobs antiguos guardados así, pero ya no se ofrece: ahora eso se
 * expresa como "Weekly, repeat every 2 weeks".
 */
export const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/** Días de la semana, 0=Domingo … 6=Sábado, como los guarda `selected_week_days`. */
export const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

const UNIT: Record<string, string> = { daily: "day", weekly: "week", monthly: "month" };
const MAX:  Record<string, number> = { daily: 30,    weekly: 20,     monthly: 12 };

/** Opciones de "Repeat every N", con la unidad y el tope propios de la frecuencia. */
export function repeatEveryOptions(freq: string): { value: string; label: string }[] {
  const unit = UNIT[freq] ?? "time";
  const max  = MAX[freq]  ?? 30;
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return { value: String(n), label: `${n} ${unit}${n === 1 ? "" : "s"}` };
  });
}

/**
 * Hasta dónde llega una repetición a la que no se le puso fin.
 *
 * El backend permite dejarla abierta, pero entonces genera hasta 500 filas de
 * una sentada — una serie semanal se estira casi diez años. Como `fetchAll` se
 * trae los jobs sin filtro de fechas, unas pocas series así llenan la respuesta
 * y empiezan a desaparecer jobs de la lista sin que nadie lo note.
 *
 * Un año es el horizonte con el que se firma este tipo de servicio, y deja la
 * serie en 52 filas para una semanal o 12 para una mensual. Siempre se puede
 * alargar: el campo queda a la vista con esta fecha puesta, no escondida.
 */
export const DEFAULT_RECURRENCE_MONTHS = 12;

/** Fin por defecto de una repetición que arranca en `jobDate`. */
export function defaultRecurrenceEnd(jobDate: Date): Date {
  return addMonths(jobDate, DEFAULT_RECURRENCE_MONTHS);
}
