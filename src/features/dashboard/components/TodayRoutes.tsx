import { MapPin, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonCard } from "@/shared/components/common/SkeletonCard";
import type { TodayRoute } from "../types/dashboard.types";

interface TodayRoutesProps {
  routes: TodayRoute[];
  isLoading: boolean;
}

/**
 * List of routes scheduled for today, each showing name and service count.
 * Clicking a route navigates to the route scheduler.
 *
 * @param routes - Today's routes with service counts
 * @param isLoading - Shows skeleton while data is loading
 */
export function TodayRoutes({ routes, isLoading }: TodayRoutesProps) {
  const navigate = useNavigate();

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
          <ul className="divide-y divide-border">
            {routes.map((route) => (
              <li
                key={route.id}
                className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate("/create-route")}
              >
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{route.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {route.serviceCount} service{route.serviceCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
