/**
 * @module calendarRange
 * Rótulo y navegación del periodo visible del calendario.
 *
 * Viven fuera del componente porque los usan dos sitios: la rejilla, cuando
 * muestra su propia cabecera, y la barra de Schedule, que navega desde fuera.
 * Si cada uno lo calculara por su cuenta acabarían diciendo cosas distintas.
 */
import {
  format,
  addDays, subDays, addWeeks, subWeeks,
  addMonths, subMonths, addYears, subYears,
  startOfWeek, endOfWeek, getMonth,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
} from "date-fns";
import type { CalendarViewType } from "../components/SchedulingCalendar";

/**
 * Rótulo del periodo visible ("Sep 14 – Sep 20, 2026").
 *
 * Se exporta porque Schedule pone la navegación en su barra de herramientas, no
 * dentro del calendario, y necesita el mismo texto — si lo recalculara por su
 * cuenta acabarían diciendo cosas distintas.
 */
export function calendarRangeLabel(date: Date, viewType: CalendarViewType): string {
  if (viewType === "day")   return format(date, "EEEE, MMMM d, yyyy");
  if (viewType === "year")  return format(date, "yyyy");
  if (viewType === "month") return format(date, "MMMM yyyy");
  const ws = startOfWeek(date, { weekStartsOn: 0 });
  const we = endOfWeek(date,   { weekStartsOn: 0 });
  return getMonth(ws) === getMonth(we)
    ? `${format(ws, "MMM d")} – ${format(we, "d, yyyy")}`
    : `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
}

/**
 * Primer y último día visibles, en "yyyy-MM-dd".
 *
 * La rejilla decide qué pinta celda por celda, pero el mapa necesita el periodo
 * de una vez para saber qué paradas mostrar. Se calcula aquí para que las dos
 * vistas coincidan: lo que se ve en el calendario es lo que se ve en el mapa.
 */
export function calendarRangeBounds(
  date: Date,
  viewType: CalendarViewType,
): { start: string; end: string } {
  const iso = (d: Date) => format(d, "yyyy-MM-dd");

  if (viewType === "day")   return { start: iso(date), end: iso(date) };
  if (viewType === "month") return { start: iso(startOfMonth(date)), end: iso(endOfMonth(date)) };
  if (viewType === "year")  return { start: iso(startOfYear(date)),  end: iso(endOfYear(date)) };
  return {
    start: iso(startOfWeek(date, { weekStartsOn: 0 })),
    end:   iso(endOfWeek(date,   { weekStartsOn: 0 })),
  };
}

/** Periodo anterior / siguiente según la vista. */
export function shiftCalendarDate(date: Date, viewType: CalendarViewType, dir: 1 | -1): Date {
  if (viewType === "day")   return dir === 1 ? addDays(date, 1)   : subDays(date, 1);
  if (viewType === "week")  return dir === 1 ? addWeeks(date, 1)  : subWeeks(date, 1);
  if (viewType === "month") return dir === 1 ? addMonths(date, 1) : subMonths(date, 1);
  return dir === 1 ? addYears(date, 1) : subYears(date, 1);
}

