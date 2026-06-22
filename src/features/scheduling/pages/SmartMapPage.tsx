import { MapPin, UserPlus, Users, Briefcase, Star } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { useSmartMap } from "../hooks/useSmartMap";
import { SmartMapView } from "../components/SmartMapView";

// ─── Filter tab definitions ───────────────────────────────────────────────────

const FILTER_TABS = [
  {
    value:       "all",
    label:       "All",
    icon:        Star,
    activeColor: "text-primary",
    underline:   "bg-primary",
  },
  {
    value:       "leads",
    label:       "Leads",
    icon:        UserPlus,
    activeColor: "text-blue-600",
    underline:   "bg-blue-500",
  },
  {
    value:       "clients",
    label:       "Clients",
    icon:        Users,
    activeColor: "text-green-600",
    underline:   "bg-green-500",
  },
  {
    value:       "employees",
    label:       "Employees",
    icon:        Briefcase,
    activeColor: "text-purple-600",
    underline:   "bg-purple-500",
  },
] as const;

// ─── KPI definitions ──────────────────────────────────────────────────────────

function buildKpis(counts: ReturnType<typeof useSmartMap>["counts"]) {
  return [
    {
      title:       "Total Locations",
      value:       counts.total,
      subtitle:    "on map",
      icon:        MapPin,
      borderColor: "hsl(var(--primary))",
      bgClass:     "bg-primary/20",
      iconColor:   "hsl(var(--primary))",
    },
    {
      title:       "Leads",
      value:       counts.leads,
      subtitle:    "active leads",
      icon:        UserPlus,
      borderColor: "hsl(var(--blue-vibrant))",
      bgClass:     "bg-blue-500/20",
      iconColor:   "hsl(var(--blue-vibrant))",
    },
    {
      title:       "Clients",
      value:       counts.clients,
      subtitle:    "total clients",
      icon:        Users,
      borderColor: "hsl(var(--green-vibrant))",
      bgClass:     "bg-green-500/20",
      iconColor:   "hsl(var(--green-vibrant))",
    },
    {
      title:       "Employees",
      value:       counts.employees,
      subtitle:    "with address",
      icon:        Briefcase,
      borderColor: "hsl(var(--purple-vibrant))",
      bgClass:     "bg-purple-500/20",
      iconColor:   "hsl(var(--purple-vibrant))",
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartMapPage() {
  const { markers, isGeocoding, selectedFilters, toggleFilter, counts } = useSmartMap();

  const kpis = buildKpis(counts);

  // Count badge uses active style when all is on (shows partial counts) or when
  // the specific filter is active
  function countBadgeClass(value: string) {
    const isAllActive  = selectedFilters.includes("all");
    const isThisActive = selectedFilters.includes(value) && !isAllActive;
    return isAllActive || isThisActive ? "bg-primary/20" : "bg-muted";
  }

  function getTabCount(value: string) {
    if (value === "all")       return counts.total;
    if (value === "leads")     return counts.leads;
    if (value === "clients")   return counts.clients;
    if (value === "employees") return counts.employees;
    return 0;
  }

  function isTabActive(value: string) {
    if (value === "all") return selectedFilters.includes("all");
    return selectedFilters.includes(value) && !selectedFilters.includes("all");
  }

  return (
    <div className="min-h-full bg-background p-2.5 flex flex-col gap-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(({ title, value, subtitle, icon: Icon, borderColor, bgClass, iconColor }) => (
              <div key={title} className="border-l-4 pl-4" style={{ borderLeftColor: borderColor }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: borderColor }}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${bgClass}`}>
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar — filter tabs + status ─────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Filter tabs */}
            <div className="flex items-center gap-6">
              {FILTER_TABS.map(({ value, label, icon: Icon, activeColor, underline }) => {
                const active = isTabActive(value);
                return (
                  <button
                    key={value}
                    onClick={() => toggleFilter(value)}
                    className={cn(
                      "relative pb-2 text-sm font-medium transition-colors flex items-center gap-1.5",
                      active ? activeColor : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                      countBadgeClass(value),
                    )}>
                      {getTabCount(value)}
                    </span>
                    {active && (
                      <span className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-full", underline)} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Geocoding status */}
            {isGeocoding && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Updating map...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none flex-1 overflow-hidden"
            style={{ minHeight: "calc(100vh - 240px)" }}>
        <SmartMapView
          markers={markers}
          className="h-full w-full"
          style={{ minHeight: "calc(100vh - 240px)" }}
        />
      </Card>
    </div>
  );
}
