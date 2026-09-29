/**
 * SchedulingCalendar — Day / Week / Month / Year views.
 * Ported from swift-slate CreateRoute.tsx, adapted for web.
 */
import {
  format,
  addDays,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  isSameDay, isSameMonth,
} from "date-fns";
import { formatDisplayTime } from "@/shared/utils/formatters";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/shared/components/ui/hover-card";
import { ScheduleEventCard } from "./ScheduleEventCard";
import { cn } from "@/shared/utils/cn";
import {
  type ScheduleEvent, eventPalette, isAllDay, coversDate,
} from "../types/scheduleEvent";
import { calendarRangeLabel, shiftCalendarDate } from "../utils/calendarRange";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarViewType = "day" | "week" | "month" | "year";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_H = 56; // px per hour slot (day/week views)

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTime(t: string | null): [number, number] {
  if (!t) return [0, 0];
  const [hh, mm] = t.split(":");
  return [parseInt(hh ?? "0", 10), parseInt(mm ?? "0", 10)];
}

function durationMins(e: ScheduleEvent): number {
  if (!e.startTime || !e.endTime) return 60;
  const [sh, sm] = parseTime(e.startTime);
  const [eh, em] = parseTime(e.endTime);
  const d = (eh * 60 + em) - (sh * 60 + sm);
  return d > 0 ? d : 60;
}

function formatHour(h: number): string {
  if (h === 0)  return "12 AM";
  if (h < 12)   return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function dateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Eventos con hora que caen en ese día — los de "todo el día" van aparte. */
function timedOnDate(events: ScheduleEvent[], d: Date) {
  const k = dateStr(d);
  return events.filter((e) => !isAllDay(e) && e.date === k);
}

/** Eventos sin hora o de varios días que cubren ese día. */
function allDayOnDate(events: ScheduleEvent[], d: Date) {
  const k = dateStr(d);
  return events.filter((e) => isAllDay(e) && coversDate(e, k));
}

function eventsForHour(events: ScheduleEvent[], d: Date, hour: number) {
  return timedOnDate(events, d).filter((e) => {
    const [h] = parseTime(e.startTime);
    return h === hour;
  });
}

/** Events that overlap a given event (for side-by-side layout) */
function overlapping(
  all: ScheduleEvent[],
  event: ScheduleEvent,
  date: Date,
): ScheduleEvent[] {
  const dayEvents = timedOnDate(all, date);
  const [ash, asm] = parseTime(event.startTime);
  const aStart = ash * 60 + asm;
  const aEnd   = aStart + durationMins(event);

  return dayEvents.filter((b) => {
    const [bsh, bsm] = parseTime(b.startTime);
    const bStart = bsh * 60 + bsm;
    const bEnd   = bStart + durationMins(b);
    return aStart < bEnd && aEnd > bStart;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SchedulingCalendarProps {
  events: ScheduleEvent[];
  viewType: CalendarViewType;
  selectedDate: Date;
  onSelectedDateChange: (d: Date) => void;
  onEventClick: (e: ScheduleEvent) => void;
  onViewTypeChange?: (vt: CalendarViewType) => void;
  onDayClick?: (d: Date) => void;
  /** Oculta la navegación propia cuando el contenedor ya la ofrece. */
  showNavigation?: boolean;
}

export function SchedulingCalendar({
  events,
  viewType,
  selectedDate,
  onSelectedDateChange,
  onEventClick,
  onViewTypeChange,
  onDayClick,
  showNavigation = true,
}: SchedulingCalendarProps) {
  const today = new Date();

  function prev() { onSelectedDateChange(shiftCalendarDate(selectedDate, viewType, -1)); }

  function next() { onSelectedDateChange(shiftCalendarDate(selectedDate, viewType, 1)); }


  return (
    <div className="w-full">
      {showNavigation && (
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">{calendarRangeLabel(selectedDate, viewType)}</h3>
          <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {viewType === "day"   && (
        <DayView
          events={events}
          date={selectedDate}
          today={today}
          onEventClick={onEventClick}
          onSlotClick={onDayClick}
        />
      )}
      {viewType === "week"  && (
        <WeekView
          events={events}
          selectedDate={selectedDate}
          today={today}
          onEventClick={onEventClick}
          onDayHeaderClick={(d) => {
            onSelectedDateChange(d);
            onViewTypeChange?.("day");
          }}
          onSlotClick={onDayClick}
        />
      )}
      {viewType === "month" && (
        <MonthView
          events={events}
          currentMonth={selectedDate}
          today={today}
          onEventClick={onEventClick}
          onDayClick={(d) => {
            onSelectedDateChange(d);
            onDayClick?.(d);
          }}
        />
      )}
      {viewType === "year"  && (
        <YearView
          events={events}
          year={selectedDate.getFullYear()}
          today={today}
          onMonthClick={(d) => {
            onSelectedDateChange(d);
            onViewTypeChange?.("month");
          }}
        />
      )}
    </div>
  );
}

/**
 * Envuelve un bloque del calendario con su tarjeta de detalle.
 *
 * `openDelay` corto pero no cero: aparecer al instante convierte cualquier
 * barrido del ratón por la rejilla en una sucesión de tarjetas parpadeando.
 */
function EventHover({ event, children }: { event: ScheduleEvent; children: React.ReactNode }) {
  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto border-0 bg-transparent p-0 shadow-none">
        <ScheduleEventCard event={event} />
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  events, date, today, onEventClick, onSlotClick,
}: {
  events: ScheduleEvent[];
  date: Date;
  today: Date;
  onEventClick: (e: ScheduleEvent) => void;
  onSlotClick?: (d: Date) => void;
}) {
  const isToday = isSameDay(date, today);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day header */}
      <div className={cn(
        "text-center py-3 border-b border-border text-sm font-semibold",
        isToday && "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
      )}>
        {format(date, "EEEE, MMMM d")}
      </div>

      {/* Banda de "todo el día": eventos sin hora y los de varios días. */}
      <AllDayBand events={allDayOnDate(events, date)} onEventClick={onEventClick} />

      {/* Scrollable hour grid */}
      <div className="overflow-y-auto max-h-[600px]">
        {Array.from({ length: 24 }, (_, hour) => {
          const slotEvents = eventsForHour(events, date, hour);

          return (
            <div key={hour} className="flex border-b border-border last:border-b-0" style={{ minHeight: SLOT_H }}>
              {/* Time label */}
              <div className="w-16 shrink-0 text-right pr-3 pt-2 text-xs text-muted-foreground border-r border-border">
                {formatHour(hour)}
              </div>

              {/* Slot area */}
              <div
                className="flex-1 relative hover:bg-muted/20 cursor-pointer transition-colors"
                style={{ minHeight: SLOT_H }}
                onClick={() => {
                  const d = new Date(date);
                  d.setHours(hour, 0, 0, 0);
                  onSlotClick?.(d);
                }}
              >
                {slotEvents.map((ev) => {
                  const [, startMin]  = parseTime(ev.startTime);
                  const durH          = durationMins(ev) / 60;
                  const topPx         = (startMin / 60) * SLOT_H;
                  const heightPx      = Math.max(durH * SLOT_H, 24);
                  const group         = overlapping(events, ev, date);
                  const idx           = group.findIndex((b) => b.id === ev.id);
                  const widthPct      = 100 / group.length;
                  const leftPct       = idx * widthPct;
                  const palette       = eventPalette(ev);

                  return (
                    <EventHover key={ev.id} event={ev}>
                    <div
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className="absolute rounded px-2 py-1 text-white text-xs cursor-pointer hover:opacity-90 z-10 overflow-hidden"
                      style={{
                        top:    topPx,
                        height: heightPx,
                        left:   `calc(${leftPct}% + 4px)`,
                        width:  `calc(${widthPct}% - 8px)`,
                        backgroundColor: palette.color,
                      }}
                    >
                      <div className="font-semibold truncate">{ev.title}</div>
                      {ev.startTime && (
                        <div className="opacity-90 truncate">
                          {formatDisplayTime(ev.startTime)}
                          {ev.endTime && ` – ${formatDisplayTime(ev.endTime)}`}
                        </div>
                      )}
                    </div>
                    </EventHover>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Banda de todo el día ─────────────────────────────────────────────────────

/**
 * Los eventos sin hora no caben en una rejilla horaria: se apilan arriba, como
 * en cualquier calendario. Los de varios días viven aquí también, porque una
 * barra que cruza jornadas no pertenece a ninguna franja.
 */
function AllDayBand({
  events, onEventClick, compact = false,
}: {
  events: ScheduleEvent[];
  onEventClick: (e: ScheduleEvent) => void;
  compact?: boolean;
}) {
  if (events.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1 border-b border-border bg-muted/20", compact ? "p-1" : "px-3 py-2")}>
      {events.map((ev) => {
        const palette = eventPalette(ev);
        return (
          <EventHover key={ev.id} event={ev}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
            className={cn(
              "w-full text-left rounded text-white font-medium truncate hover:opacity-90 transition-opacity",
              compact ? "px-1 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
            )}
            style={{ backgroundColor: palette.color }}
          >
            {ev.title}
          </button>
          </EventHover>
        );
      })}
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  events, selectedDate, today, onEventClick, onDayHeaderClick, onSlotClick,
}: {
  events: ScheduleEvent[];
  selectedDate: Date;
  today: Date;
  onEventClick: (e: ScheduleEvent) => void;
  onDayHeaderClick: (d: Date) => void;
  onSlotClick?: (d: Date) => void;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    // overflow-x-auto enables horizontal scrolling on mobile.
    // min-w-[540px] keeps columns from collapsing below a readable size.
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-[540px] overflow-hidden">
        {/* Single vertical scroll container — header is sticky so header and grid
            share the same width, fixing the Windows scrollbar misalignment bug. */}
        <div className="overflow-y-auto max-h-[600px]">
          {/* Sticky day headers */}
          <div
            className="sticky top-0 z-20 grid border-b border-border bg-muted/30"
            style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
          >
            <div className="border-r border-border" /> {/* time gutter */}
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className="text-center py-2 border-l border-border first:border-l-0">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">
                    {WEEK_DAYS[i]}
                  </div>
                  <button
                    onClick={() => onDayHeaderClick(day)}
                    className={cn(
                      "mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold hover:bg-muted transition-colors",
                      isToday && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Fila de "todo el día", alineada con las columnas de la semana. */}
          {weekDays.some((d) => allDayOnDate(events, d).length > 0) && (
            <div
              className="grid border-b border-border bg-muted/20"
              style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
            >
              <div className="text-right pr-2 py-1 text-[10px] text-muted-foreground border-r border-border">
                All day
              </div>
              {weekDays.map((day, di) => (
                <div key={di} className="border-l border-border first:border-l-0 p-0.5">
                  <AllDayBand events={allDayOnDate(events, day)} onEventClick={onEventClick} compact />
                </div>
              ))}
            </div>
          )}

          {/* Hour grid */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: "64px repeat(7, 1fr)", minHeight: SLOT_H }}>
              {/* Time label */}
              <div className="text-right pr-2 pt-1 text-[10px] text-muted-foreground border-r border-border">
                {formatHour(hour)}
              </div>

              {/* Day slots */}
              {weekDays.map((day, di) => {
                const slotEvents = eventsForHour(events, day, hour);
                return (
                  <div
                    key={di}
                    className="relative border-l border-border hover:bg-muted/20 cursor-pointer transition-colors"
                    style={{ minHeight: SLOT_H }}
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(hour, 0, 0, 0);
                      onSlotClick?.(d);
                    }}
                  >
                    {slotEvents.map((ev) => {
                      const [, startMin] = parseTime(ev.startTime);
                      const durH         = durationMins(ev) / 60;
                      const topPx        = (startMin / 60) * SLOT_H;
                      const heightPx     = Math.max(durH * SLOT_H, 20);
                      const group        = overlapping(events, ev, day);
                      const idx          = group.findIndex((b) => b.id === ev.id);
                      const widthPct     = 100 / group.length;
                      const leftPct      = idx * widthPct;
                      const palette      = eventPalette(ev);

                      return (
                        <EventHover key={ev.id} event={ev}>
                          <div
                            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                            className="absolute rounded px-1 py-0.5 text-white text-[10px] font-medium cursor-pointer hover:opacity-90 z-10 overflow-hidden"
                            style={{
                              top:    topPx,
                              height: heightPx,
                              left:   `${leftPct}%`,
                              width:  `${widthPct}%`,
                              backgroundColor: palette.color,
                            }}
                          >
                            <span className="truncate block">{ev.title}</span>
                          </div>
                        </EventHover>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

const MAX_MONTH_PILLS = 3;

function MonthView({
  events, currentMonth, today, onEventClick, onDayClick,
}: {
  events: ScheduleEvent[];
  currentMonth: Date;
  today: Date;
  onEventClick: (e: ScheduleEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  // Se recorren los días de la rejilla y no los eventos, porque uno de varios
  // días tiene que aparecer en cada jornada que cubre, no solo en la de inicio.
  const eventsOn = (day: Date) => {
    const k = dateStr(day);
    return events.filter((e) => coversDate(e, k));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day-of-week header — abbreviated to 1 char on mobile */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const k         = dateStr(day);
          const dayEvents = eventsOn(day);
          const inMonth   = isSameMonth(day, currentMonth);
          const isToday   = isSameDay(day, today);
          const overflow  = dayEvents.length - MAX_MONTH_PILLS;
          const isLastRow = idx >= days.length - 7;
          const colIdx    = idx % 7;

          return (
            <div
              key={k}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[70px] sm:min-h-[110px] p-0.5 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1 cursor-pointer",
                colIdx < 6 && "border-r border-border",
                !isLastRow  && "border-b border-border",
                isToday     && "bg-blue-50 dark:bg-blue-950/30",
                !inMonth    && "bg-muted/20",
              )}
            >
              <span className={cn(
                "text-xs sm:text-sm font-medium leading-none mb-0.5 self-start",
                isToday   && "text-blue-600 dark:text-blue-400 font-bold",
                !inMonth  && "text-muted-foreground/50",
                inMonth && !isToday && "text-foreground",
              )}>
                {format(day, "d")}
              </span>

              {dayEvents.slice(0, MAX_MONTH_PILLS).map((ev) => (
                <EventHover key={ev.id} event={ev}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="w-full text-left px-1 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs text-white font-medium truncate hover:opacity-90"
                    style={{ backgroundColor: eventPalette(ev).color }}
                  >
                    {ev.title}
                  </button>
                </EventHover>
              ))}

              {overflow > 0 && (
                <span className="text-[8px] sm:text-[10px] text-muted-foreground px-0.5 sm:px-1">+{overflow}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Year view ────────────────────────────────────────────────────────────────

function YearView({
  events, year, today, onMonthClick,
}: {
  events: ScheduleEvent[];
  year: number;
  today: Date;
  onMonthClick: (firstOfMonth: Date) => void;
}) {
  // Count appointments per month
  const countByMonth = Array(12).fill(0) as number[];
  events.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date + "T00:00:00");
    if (d.getFullYear() === year) {
      countByMonth[d.getMonth()]++;
    }
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {MONTHS.map((monthName, i) => {
        const firstOfMonth = new Date(year, i, 1);
        const isCurrentMonth =
          today.getFullYear() === year && today.getMonth() === i;
        const count = countByMonth[i];

        return (
          <button
            key={i}
            onClick={() => onMonthClick(firstOfMonth)}
            className={cn(
              "relative p-4 text-center border border-border rounded-lg hover:bg-accent/50 transition-colors",
              isCurrentMonth && "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
            )}
          >
            <span className={cn(
              "text-sm font-semibold block",
              isCurrentMonth && "text-blue-600 dark:text-blue-400",
            )}>
              {monthName}
            </span>

            {count > 0 && (
              <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
