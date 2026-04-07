/**
 * SchedulingCalendar — Day / Week / Month / Year views.
 * Ported from swift-slate CreateRoute.tsx, adapted for web.
 */
import {
  format,
  addDays, subDays,
  addWeeks, subWeeks,
  addMonths, subMonths,
  addYears, subYears,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  eachDayOfInterval,
  isSameDay, isSameMonth,
  getMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import type { AppointmentWithClient } from "../types/scheduling.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarViewType = "day" | "week" | "month" | "year";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_H = 56; // px per hour slot (day/week views)

const EVENT_COLORS = [
  "bg-pink-500", "bg-amber-500", "bg-teal-500", "bg-blue-500",
  "bg-purple-500", "bg-orange-500", "bg-green-500", "bg-rose-500",
  "bg-indigo-500", "bg-cyan-500",
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apptColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i);
    h |= 0;
  }
  return EVENT_COLORS[Math.abs(h) % EVENT_COLORS.length];
}

function parseTime(t: string | null): [number, number] {
  if (!t) return [0, 0];
  const [hh, mm] = t.split(":");
  return [parseInt(hh ?? "0", 10), parseInt(mm ?? "0", 10)];
}

function durationMins(a: AppointmentWithClient): number {
  if (!a.scheduled_time || !a.end_time) return 60;
  const [sh, sm] = parseTime(a.scheduled_time);
  const [eh, em] = parseTime(a.end_time);
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

function apptsOnDate(appts: AppointmentWithClient[], d: Date) {
  const k = dateStr(d);
  return appts.filter((a) => a.scheduled_date === k);
}

function apptsForHour(appts: AppointmentWithClient[], d: Date, hour: number) {
  return apptsOnDate(appts, d).filter((a) => {
    const [h] = parseTime(a.scheduled_time);
    return h === hour;
  });
}

/** Events that overlap a given event (for side-by-side layout) */
function overlapping(
  all: AppointmentWithClient[],
  appt: AppointmentWithClient,
  date: Date,
): AppointmentWithClient[] {
  const dayAppts = apptsOnDate(all, date);
  const [ash, asm] = parseTime(appt.scheduled_time);
  const aStart = ash * 60 + asm;
  const aEnd   = aStart + durationMins(appt);

  return dayAppts.filter((b) => {
    const [bsh, bsm] = parseTime(b.scheduled_time);
    const bStart = bsh * 60 + bsm;
    const bEnd   = bStart + durationMins(b);
    return aStart < bEnd && aEnd > bStart;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SchedulingCalendarProps {
  appointments: AppointmentWithClient[];
  viewType: CalendarViewType;
  selectedDate: Date;
  onSelectedDateChange: (d: Date) => void;
  onAppointmentClick: (a: AppointmentWithClient) => void;
  onViewTypeChange?: (vt: CalendarViewType) => void;
  onDayClick?: (d: Date) => void;
}

export function SchedulingCalendar({
  appointments,
  viewType,
  selectedDate,
  onSelectedDateChange,
  onAppointmentClick,
  onViewTypeChange,
  onDayClick,
}: SchedulingCalendarProps) {
  const today = new Date();

  function prev() {
    if (viewType === "day")   return onSelectedDateChange(subDays(selectedDate, 1));
    if (viewType === "week")  return onSelectedDateChange(subWeeks(selectedDate, 1));
    if (viewType === "month") return onSelectedDateChange(subMonths(selectedDate, 1));
    if (viewType === "year")  return onSelectedDateChange(subYears(selectedDate, 1));
  }

  function next() {
    if (viewType === "day")   return onSelectedDateChange(addDays(selectedDate, 1));
    if (viewType === "week")  return onSelectedDateChange(addWeeks(selectedDate, 1));
    if (viewType === "month") return onSelectedDateChange(addMonths(selectedDate, 1));
    if (viewType === "year")  return onSelectedDateChange(addYears(selectedDate, 1));
  }

  function title(): string {
    if (viewType === "day")   return format(selectedDate, "EEEE, MMMM d, yyyy");
    if (viewType === "year")  return format(selectedDate, "yyyy");
    if (viewType === "month") return format(selectedDate, "MMMM yyyy");
    // week
    const ws = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const we = endOfWeek(selectedDate,   { weekStartsOn: 0 });
    return getMonth(ws) === getMonth(we)
      ? `${format(ws, "MMM d")} – ${format(we, "d, yyyy")}`
      : `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
  }

  return (
    <div className="w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">{title()}</h3>
        <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {viewType === "day"   && (
        <DayView
          appointments={appointments}
          date={selectedDate}
          today={today}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onDayClick}
        />
      )}
      {viewType === "week"  && (
        <WeekView
          appointments={appointments}
          selectedDate={selectedDate}
          today={today}
          onAppointmentClick={onAppointmentClick}
          onDayHeaderClick={(d) => {
            onSelectedDateChange(d);
            onViewTypeChange?.("day");
          }}
          onSlotClick={onDayClick}
        />
      )}
      {viewType === "month" && (
        <MonthView
          appointments={appointments}
          currentMonth={selectedDate}
          today={today}
          onAppointmentClick={onAppointmentClick}
          onDayClick={(d) => {
            onSelectedDateChange(d);
            onDayClick?.(d);
          }}
        />
      )}
      {viewType === "year"  && (
        <YearView
          appointments={appointments}
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

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  appointments, date, today, onAppointmentClick, onSlotClick,
}: {
  appointments: AppointmentWithClient[];
  date: Date;
  today: Date;
  onAppointmentClick: (a: AppointmentWithClient) => void;
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

      {/* Scrollable hour grid */}
      <div className="overflow-y-auto max-h-[600px]">
        {Array.from({ length: 24 }, (_, hour) => {
          const slotAppts = apptsForHour(appointments, date, hour);

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
                {slotAppts.map((appt) => {
                  const [, startMin]  = parseTime(appt.scheduled_time);
                  const durH          = durationMins(appt) / 60;
                  const topPx         = (startMin / 60) * SLOT_H;
                  const heightPx      = Math.max(durH * SLOT_H, 24);
                  const group         = overlapping(appointments, appt, date);
                  const idx           = group.findIndex((b) => b.id === appt.id);
                  const widthPct      = 100 / group.length;
                  const leftPct       = idx * widthPct;

                  return (
                    <div
                      key={appt.id}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                      className={cn(
                        "absolute rounded px-2 py-1 text-white text-xs cursor-pointer hover:opacity-90 z-10 overflow-hidden",
                        apptColor(appt.id),
                      )}
                      style={{
                        top:    topPx,
                        height: heightPx,
                        left:   `calc(${leftPct}% + 4px)`,
                        width:  `calc(${widthPct}% - 8px)`,
                      }}
                    >
                      <div className="font-semibold truncate">{appt.clients?.full_name}</div>
                      {appt.scheduled_time && (
                        <div className="opacity-90 truncate">
                          {format(new Date(`2000-01-01T${appt.scheduled_time}`), "h:mm a")}
                          {appt.end_time && ` – ${format(new Date(`2000-01-01T${appt.end_time}`), "h:mm a")}`}
                        </div>
                      )}
                    </div>
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

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  appointments, selectedDate, today, onAppointmentClick, onDayHeaderClick, onSlotClick,
}: {
  appointments: AppointmentWithClient[];
  selectedDate: Date;
  today: Date;
  onAppointmentClick: (a: AppointmentWithClient) => void;
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

          {/* Hour grid */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: "64px repeat(7, 1fr)", minHeight: SLOT_H }}>
              {/* Time label */}
              <div className="text-right pr-2 pt-1 text-[10px] text-muted-foreground border-r border-border">
                {formatHour(hour)}
              </div>

              {/* Day slots */}
              {weekDays.map((day, di) => {
                const slotAppts = apptsForHour(appointments, day, hour);
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
                    {slotAppts.map((appt) => {
                      const [, startMin] = parseTime(appt.scheduled_time);
                      const durH         = durationMins(appt) / 60;
                      const topPx        = (startMin / 60) * SLOT_H;
                      const heightPx     = Math.max(durH * SLOT_H, 20);
                      const group        = overlapping(appointments, appt, day);
                      const idx          = group.findIndex((b) => b.id === appt.id);
                      const widthPct     = 100 / group.length;
                      const leftPct      = idx * widthPct;

                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                          className={cn(
                            "absolute rounded px-1 py-0.5 text-white text-[10px] font-medium cursor-pointer hover:opacity-90 z-10 overflow-hidden",
                            apptColor(appt.id),
                          )}
                          style={{
                            top:    topPx,
                            height: heightPx,
                            left:   `${leftPct}%`,
                            width:  `${widthPct}%`,
                          }}
                        >
                          <span className="truncate block">{appt.clients?.full_name}</span>
                        </div>
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
  appointments, currentMonth, today, onAppointmentClick, onDayClick,
}: {
  appointments: AppointmentWithClient[];
  currentMonth: Date;
  today: Date;
  onAppointmentClick: (a: AppointmentWithClient) => void;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const apptsByDate = new Map<string, AppointmentWithClient[]>();
  appointments.forEach((a) => {
    const k = a.scheduled_date;
    if (!apptsByDate.has(k)) apptsByDate.set(k, []);
    apptsByDate.get(k)!.push(a);
  });

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
          const dayAppts  = apptsByDate.get(k) ?? [];
          const inMonth   = isSameMonth(day, currentMonth);
          const isToday   = isSameDay(day, today);
          const overflow  = dayAppts.length - MAX_MONTH_PILLS;
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

              {dayAppts.slice(0, MAX_MONTH_PILLS).map((a) => (
                <button
                  key={a.id}
                  onClick={(e) => { e.stopPropagation(); onAppointmentClick(a); }}
                  className={cn(
                    "w-full text-left px-1 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs text-white font-medium truncate hover:opacity-90",
                    apptColor(a.id),
                  )}
                >
                  {a.clients?.full_name ?? "Client"}
                </button>
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
  appointments, year, today, onMonthClick,
}: {
  appointments: AppointmentWithClient[];
  year: number;
  today: Date;
  onMonthClick: (firstOfMonth: Date) => void;
}) {
  // Count appointments per month
  const countByMonth = Array(12).fill(0) as number[];
  appointments.forEach((a) => {
    const d = new Date(a.scheduled_date + "T00:00:00");
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
