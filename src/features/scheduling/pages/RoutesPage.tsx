import { useState } from "react";
import { Plus, Calendar, Map, MapPin, Check, Trash2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
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
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useRoutes, useCreateRoute, useDeleteRoute } from "../hooks/useRoutes";
import { useAppointments } from "../hooks/useAppointments";
import { useProfile, getCompanyAddress } from "@/shared/hooks/useProfile";
import { SchedulingCalendar, type CalendarViewType } from "../components/SchedulingCalendar";
import { AppointmentDetailModal } from "../components/AppointmentDetailModal";
import { RouteMapView } from "../components/RouteMapView";
import { AddAppointmentPage } from "./AddAppointmentPage";
import type { AppointmentWithClient, Route } from "../types/scheduling.types";

type MapViewMode = "calendar" | "map";

const VIEW_TYPE_LABELS: Record<CalendarViewType, string> = {
  day:   "Day",
  week:  "Week",
  month: "Month",
  year:  "Year",
};

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
  const [mapViewMode,    setMapViewMode]    = useState<MapViewMode>("calendar");
  const [calViewType,    setCalViewType]    = useState<CalendarViewType>("month");
  const [selectedDate,   setSelectedDate]   = useState<Date>(new Date());
  const [routeFilter,    setRouteFilter]    = useState<string>("all");
  const [deleteTarget,   setDeleteTarget]   = useState<Route | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithClient | null>(null);

  // ── Add appointment modal ─────────────────────────────────────────────────
  const [addApptOpen,    setAddApptOpen]    = useState(false);
  const [addApptRouteId, setAddApptRouteId] = useState("");
  const [addApptDate,    setAddApptDate]    = useState("");

  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const { data: profile }                               = useProfile();
  const companyAddress                                  = getCompanyAddress(profile);

  const { mutate: createRoute, isPending: isCreating } = useCreateRoute();
  const { mutate: deleteRoute, isPending: isDeleting  } = useDeleteRoute();

  const filters = routeFilter !== "all" ? { routeId: routeFilter } : undefined;
  const { data: appointments = [], isLoading: apptsLoading } = useAppointments(filters);

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
    <div className="flex flex-col min-h-full">
      {/* ── Toggle: Calendar / Map ─────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-4 border-b border-border bg-background">
        <Calendar className={`h-4 w-4 ${mapViewMode === "calendar" ? "text-primary" : "text-muted-foreground"}`} />
        <span className={`text-sm font-medium ${mapViewMode === "calendar" ? "text-foreground" : "text-muted-foreground"}`}>
          Calendar
        </span>
        <Switch
          checked={mapViewMode === "map"}
          onCheckedChange={(v) => setMapViewMode(v ? "map" : "calendar")}
        />
        <span className={`text-sm font-medium ${mapViewMode === "map" ? "text-foreground" : "text-muted-foreground"}`}>
          Map
        </span>
        <Map className={`h-4 w-4 ${mapViewMode === "map" ? "text-primary" : "text-muted-foreground"}`} />
      </div>

      {/* ── Control bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border flex-wrap">
        {/* Left: date chip + Day/Week/Month/Year dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 text-sm text-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {format(new Date(), "MMMM do, yyyy")}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 min-w-[90px] justify-between">
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
        </div>

        {/* Right: route selector + add service button */}
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
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Service
          </Button>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : mapViewMode === "map" ? (
          <RouteMapView
            appointments={
              effectiveRouteId !== "all"
                ? appointments.filter((a) => a.route_id === effectiveRouteId)
                : appointments
            }
            className="h-[calc(100vh-220px)] min-h-[400px] w-full"
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
      </div>

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

      <AppointmentDetailModal
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        companyAddress={companyAddress}
        onAppointmentChange={() => setSelectedAppointment(null)}
      />

      <AddAppointmentPage
        open={addApptOpen}
        onClose={() => setAddApptOpen(false)}
        defaultRouteId={addApptRouteId}
        defaultDate={addApptDate}
      />
    </div>
  );
}
