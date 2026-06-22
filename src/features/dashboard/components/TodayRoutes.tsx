import { useState, useEffect } from "react";
import { MapPin, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonCard } from "@/shared/components/common/SkeletonCard";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { RouteMapView } from "@/features/scheduling/components/RouteMapView";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import { cn } from "@/shared/utils/cn";
import type { TodayRoute } from "../types/dashboard.types";
import type { AppointmentWithClient } from "@/features/scheduling/types/scheduling.types";

interface TodayRoutesProps {
  routes: TodayRoute[];
  isLoading: boolean;
  /** Today's date in YYYY-MM-DD (user's local timezone). Used to fetch appointments. */
  today: string;
}

/**
 * List of routes scheduled for today with an interactive Google Maps preview.
 * Clicking a route selects it and renders its appointments on the map below.
 *
 * @param routes    - Today's routes with service counts
 * @param isLoading - Shows skeleton while data loads
 * @param today     - Date string used to query appointments (YYYY-MM-DD)
 */
export function TodayRoutes({ routes, isLoading, today }: TodayRoutesProps) {
  const navigate = useNavigate();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Auto-select first route when data loads
  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch appointments for the selected route ─────────────────────────────

  const { data: appointments = [], isLoading: apptLoading } = useQuery<AppointmentWithClient[]>({
    queryKey: QK.routeAppointmentsByDate(selectedRouteId ?? "", today),
    enabled: !!selectedRouteId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_appointments")
        .select(`
          *,
          clients ( id, full_name, phone, email, service_street, service_apt, service_city, service_state, service_zip ),
          routes   ( id, name )
        `)
        .eq("route_id", selectedRouteId!)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentWithClient[];
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleRouteClick(routeId: string) {
    setSelectedRouteId((prev) => (prev === routeId ? null : routeId));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Today's Routes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-5 pb-4">
            <SkeletonCard rows={3} />
          </div>
        ) : routes.length === 0 ? (
          <div className="px-5 pb-4">
            <EmptyState
              icon={Route}
              title="No routes today"
              description="Routes scheduled for today will appear here."
              actionLabel="Go to Routes"
              onAction={() => navigate("/create-route")}
            />
          </div>
        ) : (
          <>
            {/* ── Route list ─────────────────────────────────────────────── */}
            <ul className="divide-y divide-border">
              {routes.map((route) => {
                const active = selectedRouteId === route.id;
                return (
                  <li
                    key={route.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors",
                      active ? "bg-primary/10" : "hover:bg-accent/50",
                    )}
                    onClick={() => handleRouteClick(route.id)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      active
                        ? "bg-primary/20 text-primary"
                        : "bg-warning-subtle text-warning",
                    )}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate transition-colors",
                        active ? "text-primary" : "text-foreground",
                      )}>
                        {route.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {route.serviceCount} service{route.serviceCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {active && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* ── Route map ──────────────────────────────────────────────── */}
            {selectedRouteId && (
              <div className="px-4 pb-4 pt-3 border-t border-border">
                {apptLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <RouteMapView
                    appointments={appointments}
                    className="h-48 rounded-lg"
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
