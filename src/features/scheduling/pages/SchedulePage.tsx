/**
 * Schedule — jobs y tasks sobre el mismo calendario.
 *
 * La página solo orquesta: reúne los eventos de las dos entidades, los filtra y
 * se los pasa a `SchedulingCalendar`, que no sabe de dónde vienen. Al pulsar uno
 * se abre el panel de detalle de su feature, el mismo que se usa en Jobs y Tasks.
 */
import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Users, Briefcase, ListChecks,
  Calendar as CalendarIcon, Map as MapIcon, LayoutGrid,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { useJobs } from "@/features/jobs/hooks/useJobs";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";
import { JobDetailPanel } from "@/features/jobs/components/JobDetailPanel";
import { AddJobPage } from "@/features/jobs/pages/AddJobPage";
import { TaskDetailModal } from "@/features/tasks/components/TaskDetailModal";
import { TaskForm } from "@/features/tasks/components/TaskForm";
import type { TaskWithClient } from "@/features/tasks/types/task.types";
import { SchedulingCalendar, type CalendarViewType } from "../components/SchedulingCalendar";
import { ScheduleMapView } from "../components/ScheduleMapView";
import { ScheduleMapPanel } from "../components/ScheduleMapPanel";
import { useScheduleGeocode } from "../hooks/useScheduleGeocode";
import { calendarRangeLabel, calendarRangeBounds, shiftCalendarDate } from "../utils/calendarRange";
import { coversDate, jobToEvent, taskToEvent, type ScheduleEvent } from "../types/scheduleEvent";

type TypeFilter = "all" | "job" | "task";
/** Las dos maneras de mirar el mismo día: cuándo pasa y dónde pasa. */
type Mode = "calendar" | "map";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all",  label: "All" },
  { value: "job",  label: "Jobs" },
  { value: "task", label: "Tasks" },
];

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "day",   label: "Day" },
  { value: "week",  label: "Week" },
  { value: "month", label: "Month" },
  { value: "year",  label: "Year" },
];

/** Nombre legible de un empleado, venga como venga del backend. */
function employeeName(e: Record<string, unknown>): string {
  const full = e.full_name as string | undefined;
  if (full) return full;
  const parts = [e.first_name, e.last_name].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" ") : "Employee";
}

export function SchedulePage() {
  const { data: jobs = [] }      = useJobs();
  const { data: tasks = [] }     = useTasks();
  const { data: employees = [] } = useAllEmployees();

  const [mode,         setMode]         = useState<Mode>("calendar");
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("all");
  const [viewType,     setViewType]     = useState<CalendarViewType>("week");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dateOpen,     setDateOpen]     = useState(false);
  /** Vacío = sin filtrar. Un evento pasa si alguno de sus empleados está elegido. */
  const [crewIds,      setCrewIds]      = useState<string[]>([]);

  const [openJobId,   setOpenJobId]   = useState<string | null>(null);
  const [openTask,    setOpenTask]    = useState<TaskWithClient | null>(null);
  const [newJobOpen,  setNewJobOpen]  = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  /** Parada resaltada en el mapa; la eligen tanto la chincheta como la lista. */
  const [selectedStop, setSelectedStop] = useState<string | null>(null);

  // El detalle de una task se abre con el objeto, no con su id, así que se
  // indexa una vez en lugar de recorrer la lista en cada clic.
  const taskById = useMemo(() => {
    const m = new Map<string, TaskWithClient>();
    (tasks as TaskWithClient[]).forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const events = useMemo(() => {
    const all: ScheduleEvent[] = [
      ...jobs.map(jobToEvent),
      ...(tasks as TaskWithClient[]).map(taskToEvent),
    ].filter((e) => e.date);

    return all
      .filter((e) => typeFilter === "all" || e.type === typeFilter)
      .filter((e) => crewIds.length === 0 || e.crew.some((id) => crewIds.includes(id)));
  }, [jobs, tasks, typeFilter, crewIds]);

  /**
   * Paradas del periodo visible, ordenadas como se recorre el día: primero por
   * fecha, luego por hora. Ese orden es el que numera las chinchetas.
   */
  const stops = useMemo(() => {
    if (mode !== "map") return [];
    const { start, end } = calendarRangeBounds(selectedDate, viewType);

    return events
      .filter((e) => coversDate(e, start) || (e.date >= start && e.date <= end))
      .sort((a, b) =>
        a.date === b.date
          ? (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
          : a.date.localeCompare(b.date),
      );
  }, [events, mode, selectedDate, viewType]);

  const { coords, isGeocoding } = useScheduleGeocode(stops);

  /** Las paradas guardan ids de empleado; la lista muestra nombres. */
  const crewNames = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach((emp) => {
      const record = emp as unknown as Record<string, unknown>;
      m.set(String(record.id), employeeName(record));
    });
    return m;
  }, [employees]);

  /**
   * Numeración de las paradas, 1, 2, 3… en el orden del recorrido.
   *
   * Solo cuentan las que se pudieron situar: si una task sin dirección gastara
   * un número, el mapa saltaría del 1 al 3 y parecería que falta una chincheta.
   */
  const stopNumbers = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    stops.forEach((e) => { if (coords.has(e.id)) m.set(e.id, ++n); });
    return m;
  }, [stops, coords]);

  function openEvent(e: ScheduleEvent) {
    if (e.type === "job") { setOpenJobId(e.refId); return; }
    const t = taskById.get(e.refId);
    if (t) setOpenTask(t);
  }

  const toggleCrew = (id: string) =>
    setCrewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── Título y creación ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <h1 className="text-2xl font-bold">Schedules</h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-9 bg-green-vibrant text-white hover:bg-green-vibrant/90">
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setNewJobOpen(true)}>
              <Briefcase className="w-4 h-4 mr-2" /> Job
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNewTaskOpen(true)}>
              <ListChecks className="w-4 h-4 mr-2" /> Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Barra de herramientas ──────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[130px] h-9 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>Type: {o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Navegación del periodo — el salto depende de la vista activa. */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="h-9 w-9"
                  onClick={() => setSelectedDate((d) => shiftCalendarDate(d, viewType, -1))}
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 whitespace-nowrap">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {calendarRangeLabel(selectedDate, viewType)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { if (d) { setSelectedDate(d); setDateOpen(false); } }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline" size="icon" className="h-9 w-9"
                  onClick={() => setSelectedDate((d) => shiftCalendarDate(d, viewType, 1))}
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="h-9" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>

              <Select value={viewType} onValueChange={(v) => setViewType(v as CalendarViewType)}>
                <SelectTrigger className="w-[130px] h-9 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>View: {o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Calendario o mapa — el resto de filtros valen para los dos. */}
              <div className="flex items-center rounded-md border border-input p-0.5">
                <Button
                  variant={mode === "calendar" ? "secondary" : "ghost"}
                  size="sm" className="h-8 px-2.5"
                  onClick={() => setMode("calendar")}
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Calendar
                </Button>
                <Button
                  variant={mode === "map" ? "secondary" : "ghost"}
                  size="sm" className="h-8 px-2.5"
                  onClick={() => setMode("map")}
                >
                  <MapIcon className="w-4 h-4 mr-1.5" /> Map
                </Button>
              </div>

            {/* Crews — filtra por los empleados asignados a cada job o task. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Users className="w-4 h-4 mr-1.5" />
                  Crews
                  {crewIds.length > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 h-5 px-1.5 text-[11px] bg-primary/10 text-primary border-primary/30"
                    >
                      {crewIds.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-medium">Filter by crew</span>
                  {crewIds.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCrewIds([])}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {employees.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">No employees yet</p>
                  ) : (
                    employees.map((emp) => {
                      const record = emp as unknown as Record<string, unknown>;
                      const id = String(record.id);
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        >
                          <Checkbox checked={crewIds.includes(id)} onCheckedChange={() => toggleCrew(id)} />
                          <span className="text-sm truncate">{employeeName(record)}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Calendario o mapa ──────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none overflow-hidden">
        {mode === "calendar" ? (
          <CardContent className="p-2 sm:p-4">
            <SchedulingCalendar
              events={events}
              viewType={viewType}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onViewTypeChange={setViewType}
              onEventClick={openEvent}
              // La navegación vive en la barra de arriba, no dentro de la rejilla.
              showNavigation={false}
            />
          </CardContent>
        ) : (
          <div className="flex h-[calc(100vh-15rem)] min-h-[30rem] flex-col lg:flex-row">
            <div className="w-full shrink-0 border-b border-border lg:h-full lg:w-80 lg:border-b-0 lg:border-r">
              <ScheduleMapPanel
                events={stops}
                crewNames={crewNames}
                stopNumbers={stopNumbers}
                selectedId={selectedStop}
                onSelect={(e) => setSelectedStop(e.id)}
                onOpen={openEvent}
              />
            </div>

            <div className="relative min-h-[20rem] flex-1">
              <ScheduleMapView
                events={stops}
                coords={coords}
                stopNumbers={stopNumbers}
                selectedId={selectedStop}
                onSelect={(e) => setSelectedStop(e.id)}
                className="h-full w-full"
              />
              {isGeocoding && (
                <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                  Locating stops…
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Detalle y creación ─────────────────────────────────────────────── */}
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

      <AddJobPage open={newJobOpen} onClose={() => setNewJobOpen(false)} />
      <TaskForm  open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />
    </div>
  );
}

export default SchedulePage;
