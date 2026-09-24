import { MapPin, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { Route } from "../../types/scheduling.types";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

interface Props {
  routes: Route[];
  routeId: string;
  onRouteChange: (id: string) => void;
  onCreateRoute: () => void;
  isCreating: boolean;
  isLoading: boolean;
  error?: string;
}

export function AppointmentRouteStep({
  routes,
  routeId,
  onRouteChange,
  onCreateRoute,
  isCreating,
  isLoading,
  error,
}: Props) {
  const selected = routes.find((r) => r.id === routeId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Select a route to add the service
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose from your existing routes</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between" disabled={isLoading}>
                  <span className={selected ? "text-foreground" : "text-muted-foreground"}>
                    {selected?.name ?? "Select a route"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[240px]">
                {routes.length === 0 ? (
                  <DropdownMenuItem disabled>No routes available</DropdownMenuItem>
                ) : (
                  routes.map((route) => (
                    <DropdownMenuItem
                      key={route.id}
                      onClick={() => onRouteChange(route.id)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{route.name}</span>
                      {routeId === route.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onCreateRoute}
              disabled={isCreating || isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? "Creating..." : "Create new route"}
            </Button>

          </div>

        </CardContent>
      </Card>

    </div>
  );
}
