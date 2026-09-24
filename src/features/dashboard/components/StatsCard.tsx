import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  /** Tailwind bg + text classes for the colored card, e.g. "bg-blue-500 text-white" */
  colorClass: string;
  onClick?: () => void;
}

/**
 * Colored KPI stat card used in the dashboard header row.
 *
 * @param label - Card label (e.g. "Monthly Revenue")
 * @param value - Main metric value (e.g. "$12,345.00")
 * @param subtext - Supporting text shown below the value
 * @param icon - Lucide icon component
 * @param colorClass - Tailwind classes for the card background and text color
 * @param onClick - Optional click handler (navigates to the related section)
 */
export function StatsCard({ label, value, subtext, icon: Icon, colorClass, onClick }: StatsCardProps) {
  return (
    <Card
      className={`border-0 cursor-pointer hover:opacity-90 transition-opacity ${colorClass}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/80">{label}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            <p className="text-xs text-white/70 mt-1">{subtext}</p>
          </div>
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
