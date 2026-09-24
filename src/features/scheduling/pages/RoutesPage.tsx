import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, Map, MapPin, Check, Trash2, ChevronDown } from "lucide-react";
import { format, startOfWeek, endOfWeek, getMonth } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import { Separator } from "@/shared/components/ui/separator";
import { Card, CardContent } from "@/shared/components/ui/card";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useRoutes, useCreateRoute, useDeleteRoute } from "../hooks/useRoutes";
import { useAppointments } from "../hooks/useAppointments";
import { useProfile, getCompanyAddress } from "@/shared/hooks/useProfile";
import { SchedulingCalendar, type CalendarViewType } from "../components/SchedulingCalendar";
import { AppointmentDetailPanel } from "../components/AppointmentDetailPanel";
import { RouteMapView } from "../components/RouteMapView";
import { AddAppointmentPage, type FromEstimateData } from "./AddAppointmentPage";
import type { AppointmentWithClient, Route } from "../types/scheduling.types";

type MapViewMode = "calendar" | "map";

const VIEW_TYPE_LABELS: Record<CalendarViewType, string> = {
  day:   "Day",
  week:  "Week",
  month: "Month",
  year:  "Year",
};

/** Formats the date chip label to match the active calendar view. */
function formatDateChip(date: Date, viewType: CalendarViewType, mode: MapViewMode): string {
  if (mode === "map") return format(date, "MMMM d, yyyy");
  if (viewType === "day")   return format(date, "MMMM d, yyyy");
  if (viewType === "month") return format(date, "MMMM yyyy");
  if (viewType === "year")  return format(date, "yyyy");
  // week
  const ws = startOfWeek(date, { weekStartsOn: 0 });
  const we = endOfWeek(date,   { weekStartsOn: 0 });
  return getMonth(ws) === getMonth(we)
    ? `${format(ws, "MMM d")} – ${format(we, "d, yyyy")}`
    : `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
}

// ─── Route selector ───────────────────────────────────────────────────────────

function RouteSelector({
  routes,
  value,
  onChange,
  onDelete,
  onAddNew,
  isCreating,
}: {
  routes: Route[];
  value: string;
  onChange: (id: string) => void;
  onDelete: (route: Route) => void;
  onAddNew: () => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedName =
    routes.find((r) => r.id === value)?.name ?? (routes.length > 0 ? routes[0].name : "Routes");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 min-w-[130px] justify-between text-sm font-medium">
          <span className="truncate">{selectedName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52 p-1">
        {routes.map((route) => (
          <div key={route.id} className="flex items-center rounded-md hover:bg-accent transition-colors">
            <button
              onClick={() => { onChange(route.id); setOpen(false); }}
              className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-sm text-left"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 truncate font-medium">{route.name}</span>
              {value === route.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(route); }}
              className="p-2 text-destructive hover:text-destructive/80 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {routes.length > 0 && <Separator className="my-1" />}

        <button
          onClick={() => { setOpen(false); onAddNew(); }}
          disabled={isCreating}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{isCreating ? "Creating…" : "Add New Route"}</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ─── Success modal ────────────────────────────────────────────────────────────

function RouteSuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm text-center p-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            Congratulations! 🎉
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            You have successfully created your first route!
          </p>
        </div>
        <Button onClick={onClose} className="w-full mt-6 h-12 text-base">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RoutesPage() {
  const location = useLocation();
  const [mapViewMode,     setMapViewMode]     = useState<MapViewMode>("calendar");
  const [calViewType,     setCalViewType]     = useState<CalendarViewType>("month");
  const [selectedDate,    setSelectedDate]    = useState<Date>(new Date());
  const [datePickerOpen,  setDatePickerOpen]  = useState(false);
  const [routeFilter,    setRouteFilter]    = useState<string>("all");
  const [deleteTarget,   setDeleteTarget]   = useState<Route | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithClient | null>(null);

  // ── Add appointment modal ─────────────────────────────────────────────────
  const [addApptOpen,        setAddApptOpen]        = useState(false);
  const [addApptRouteId,     setAddApptRouteId]     = useState("");
  const [addApptDate,        setAddApptDate]        = useState("");
  const [addApptFromEstimate, setAddApptFromEstimate] = useState<FromEstimateData | undefined>();

  // Auto-open appointment wizard when navigated from an accepted estimate
  useEffect(() => {
    const state = location.state as { fromEstimate?: FromEstimateData } | null;
    if (state?.fromEstimate) {
      setAddApptFromEstimate(state.fromEstimate);
      setAddApptOpen(true);
      // Clear state so re-renders don't re-open
      window.history.replaceState({}, "", location.pathname + location.search);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit appointment modal ────────────────────────────────────────────────
  const [editApptOpen, setEditApptOpen] = useState(false);
  const [editApptId,   setEditApptId]   = useState<string | undefined>(undefined);

  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const { data: profile }                               = useProfile();
  const companyAddress                                  = getCompanyAddress(profile);

  const { mutate: createRoute, isPending: isCreating } = useCreateRoute();
  const { mutate: deleteRoute, isPending: isDeleting  } = useDeleteRoute();

  const filters = routeFilter !== "all" ? { routeId: routeFilter } : undefined;
  const { data: appointments = [], isLoading: apptsLoading, refetch: refetchAppointments } = useAppointments(filters);

  const isLoading = routesLoading || apptsLoading;

  // Effective route filter — if "all" but routes exist, use first route
  const effectiveRouteId =
    routeFilter !== "all"
      ? routeFilter
      : routes.length > 0
        ? routes[0].id
        : "all";

  function handleAddNewRoute() {
    const nextName = `Route ${routes.length + 1}`;
    const isFirst  = routes.length === 0;
    createRoute(nextName, {
      onSuccess: (newRoute) => {
        setRouteFilter(newRoute.id);
        if (isFirst) setShowSuccessModal(true);
      },
    });
  }

  function handleDeleteRoute(route: Route) {
    deleteRoute(route.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (routeFilter === route.id) setRouteFilter("all");
      },
    });
  }

  // Sync effectiveRouteId into routeFilter when routes load for the first time
  const displayRouteId = routeFilter === "all" && routes.length > 0 ? routes[0].id : routeFilter;

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">
      {/* ── Toolbar Card: Toggle + Controls ────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          {/* Mobile/Tablet (< lg): 2 rows. Desktop (≥ lg): single row */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">

            {/* Row 1 / Left side on desktop */}
            <div className="flex items-center justify-between gap-2 lg:gap-3">
              {/* Calendar / Map toggle — text labels only on desktop */}
              <div className="flex items-center gap-1.5 lg:gap-2">
                <CalendarIcon className={`h-4 w-4 shrink-0 ${mapViewMode === "calendar" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`hidden lg:inline text-sm font-medium ${mapViewMode === "calendar" ? "text-foreground" : "text-muted-foreground"}`}>
                  Calendar
                </span>
                <Switch
                  checked={mapViewMode === "map"}
                  onCheckedChange={(v) => setMapViewMode(v ? "map" : "calendar")}
                />
                <span className={`hidden lg:inline text-sm font-medium ${mapViewMode === "map" ? "text-foreground" : "text-muted-foreground"}`}>
                  Map
                </span>
                <Map className={`h-4 w-4 shrink-0 ${mapViewMode === "map" ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <Separator orientation="vertical" className="h-6 hidden lg:block" />

              {/* Date chip */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground bg-background hover:bg-muted transition-colors cursor-pointer">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[140px] lg:max-w-none">
                      {formatDateChip(selectedDate, calViewType, mapViewMode)}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) { setSelectedDate(d); setDatePickerOpen(false); }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* View type dropdown — hidden in map mode */}
              {mapViewMode === "calendar" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 min-w-[80px] justify-between bg-background">
                      {VIEW_TYPE_LABELS[calViewType]}
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-28">
                    {(["day", "week", "month", "year"] as CalendarViewType[]).map((vt) => (
                      <DropdownMenuItem
                        key={vt}
                        onClick={() => setCalViewType(vt)}
                        className={calViewType === vt ? "bg-accent" : ""}
                      >
                        {VIEW_TYPE_LABELS[vt]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Row 2 / Right side on desktop */}
            <div className="flex items-center gap-2">
              <RouteSelector
                routes={routes}
                value={displayRouteId}
                onChange={setRouteFilter}
                onDelete={setDeleteTarget}
                onAddNew={handleAddNewRoute}
                isCreating={isCreating}
              />

              <Button
                onClick={() => {
                  setAddApptRouteId(displayRouteId !== "all" ? displayRouteId : "");
                  setAddApptDate("");
                  setAddApptOpen(true);
                }}
                className="h-9 ml-auto lg:ml-0"
              >
                <Plus className="h-4 w-4 lg:mr-1.5" />
                <span className="hidden lg:inline">Add Service</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main content Card ───────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-2 sm:p-4">
          {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : mapViewMode === "map" ? (
            <RouteMapView
              appointments={
                (effectiveRouteId !== "all"
                  ? appointments.filter((a) => a.route_id === effectiveRouteId)
                  : appointments
                ).filter((a) => a.scheduled_date === format(selectedDate, "yyyy-MM-dd"))
              }
              className="h-[calc(100vh-260px)] min-h-[400px] w-full"
            />
          ) : (
            <SchedulingCalendar
              appointments={appointments}
              viewType={calViewType}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onViewTypeChange={setCalViewType}
              onAppointmentClick={setSelectedAppointment}
              onDayClick={(date) => {
                setAddApptDate(format(date, "yyyy-MM-dd"));
                setAddApptRouteId(displayRouteId !== "all" ? displayRouteId : "");
                setAddApptOpen(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Modals & dialogs ───────────────────────────────────────── */}
      <RouteSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete route?"
        description={`"${deleteTarget?.name}" and all its appointments will be permanently deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteTarget && handleDeleteRoute(deleteTarget)}
      />

      <AppointmentDetailPanel
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        companyAddress={companyAddress}
        onAppointmentChange={() => setSelectedAppointment(null)}
        onEdit={(appointmentId) => {
          setSelectedAppointment(null);
          setEditApptId(appointmentId);
          setEditApptOpen(true);
        }}
      />

      <AddAppointmentPage
        open={addApptOpen}
        onClose={() => { setAddApptOpen(false); setAddApptFromEstimate(undefined); }}
        defaultRouteId={addApptRouteId}
        defaultDate={addApptDate}
        fromEstimate={addApptFromEstimate}
      />

      <AddAppointmentPage
        open={editApptOpen}
        onClose={() => { setEditApptOpen(false); setEditApptId(undefined); }}
        onUpdated={refetchAppointments}
        editId={editApptId}
      />
    </div>
  );
}
