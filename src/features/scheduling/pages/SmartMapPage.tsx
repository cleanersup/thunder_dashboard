import { PageHeader } from "@/shared/components/common/PageHeader";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { cn } from "@/shared/utils/cn";
import { useSmartMap } from "../hooks/useSmartMap";
import { SmartMapView } from "../components/SmartMapView";
import type { SmartMapFilter } from "../types/scheduling.types";

const FILTER_PILLS: { value: SmartMapFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-gray-600" },
  { value: "lead", label: "Leads", color: "bg-blue-500" },
  { value: "client", label: "Clients", color: "bg-green-500" },
  { value: "employee", label: "Employees", color: "bg-purple-500" },
];

export function SmartMapPage() {
  const { markers, isLoading, filter, setFilter, counts } = useSmartMap();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Smart Map" />

      {/* Filter bar */}
      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFilter(pill.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                filter === pill.value
                  ? `${pill.color} text-white border-transparent`
                  : "bg-background text-foreground border-border hover:bg-accent",
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Count chips */}
        <div className="flex gap-2 ml-2">
          <span className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            {counts.leads} Leads
          </span>
          <span className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
            {counts.clients} Clients
          </span>
          <span className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
            {counts.employees} Employees
          </span>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative px-6 pb-6">
        {isLoading && markers.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-muted rounded-lg">
            <LoadingSpinner />
          </div>
        ) : (
          <SmartMapView
            markers={markers}
            className="h-full w-full rounded-lg overflow-hidden"
          />
        )}
      </div>
    </div>
  );
}
