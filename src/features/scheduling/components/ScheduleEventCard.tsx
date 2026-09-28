/**
 * @module ScheduleEventCard
 * Tarjeta que se asoma al pasar el ratón sobre un evento del calendario.
 *
 * Responde de un vistazo lo que el bloque no cabe: cuándo exactamente, cómo
 * contactar y dónde es. Es solo consulta — para actuar se pulsa el bloque y se
 * abre el panel de detalle de la entidad.
 *
 * Va sobre fondo oscuro a propósito: aparece flotando encima de la rejilla, y un
 * fondo claro se confundiría con las celdas que tiene debajo.
 */
import type { ReactNode } from "react";
import {
  Calendar, Clock, Phone, Mail, MapPin, DollarSign, Navigation,
  Briefcase, ListChecks,
} from "lucide-react";
import { formatDisplayTime, formatCurrency } from "@/shared/utils/formatters";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { parseDateOnly } from "@/shared/utils/formatters";
import { format } from "date-fns";
import { eventPalette, eventStatusLabel, type ScheduleEvent } from "../types/scheduleEvent";

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-white/45">{icon}</span>
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-white/90">{children}</div>
    </div>
  );
}

export function ScheduleEventCard({ event }: { event: ScheduleEvent }) {
  const palette = eventPalette(event);
  const status  = eventStatusLabel(event);
  const TypeIcon = event.type === "task" ? ListChecks : Briefcase;

  const dayLabel = event.date ? format(parseDateOnly(event.date), "EEE, MMM d") : null;
  const endLabel = event.endDate && event.endDate !== event.date
    ? format(parseDateOnly(event.endDate), "EEE, MMM d")
    : null;

  const timeLabel = event.startTime
    ? `${formatDisplayTime(event.startTime)}${event.endTime ? ` – ${formatDisplayTime(event.endTime)}` : ""}`
    : "All day";

  const mapsUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`
    : null;

  return (
    <div className="w-[21rem] overflow-hidden rounded-lg bg-slate-900 text-white shadow-xl">

      {/* Cabecera: quién es, su identificador y en qué estado está */}
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${palette.color}33`, color: palette.color }}
        >
          <TypeIcon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{event.title}</p>
          {event.code && (
            <p className="truncate text-xs text-white/55">
              {event.type === "task" ? "Task" : "Job"} #{event.code}
            </p>
          )}
        </div>

        {status && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${palette.color}2E`, color: palette.color }}
          >
            {status}
          </span>
        )}
      </div>

      {/* Detalle */}
      <div className="flex flex-col gap-2.5 border-t border-white/10 p-4">
        {dayLabel && (
          <Row icon={<Calendar className="h-4 w-4" />}>
            {dayLabel}{endLabel && ` – ${endLabel}`}
          </Row>
        )}

        <Row icon={<Clock className="h-4 w-4" />}>{timeLabel}</Row>

        {event.phone && (
          <Row icon={<Phone className="h-4 w-4" />}>{formatPhoneDisplay(event.phone)}</Row>
        )}

        {event.email && (
          <Row icon={<Mail className="h-4 w-4" />}>
            <span className="block truncate">{event.email}</span>
          </Row>
        )}

        {event.address && (
          <Row icon={<MapPin className="h-4 w-4" />}>
            <div className="flex items-start gap-2">
              <span className="flex-1">{event.address}</span>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in Google Maps"
                  className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-white/10"
                  style={{ color: palette.color }}
                >
                  <Navigation className="h-4 w-4" />
                </a>
              )}
            </div>
          </Row>
        )}

        {(event.amount !== null || event.subtitle) && (
          <div className="flex items-end justify-between gap-3 pt-0.5">
            {event.amount !== null ? (
              <Row icon={<DollarSign className="h-4 w-4" />}>${formatCurrency(event.amount)}</Row>
            ) : <span />}
            {event.subtitle && (
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-white/45">
                {event.subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
