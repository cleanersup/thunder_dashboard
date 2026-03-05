import { Clock, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { TimeEntry } from "../types/timeClock.types";

interface Props {
  entries: TimeEntry[];
}

export function TimeClockKPICards({ entries }: Props) {
  const activeNow  = entries.filter((e) => e.clock_in_time && !e.clock_out_time).length;
  const totalHours = entries.reduce((s, e) => s + (e.total_hours ?? 0), 0);
  const totalPay   = entries.reduce((s, e) => s + (e.total_hours ?? 0) * (e.employees?.hourly_rate ?? 0), 0);

  const empWeekly  = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.employee_id] = (acc[e.employee_id] ?? 0) + (e.total_hours ?? 0);
    return acc;
  }, {});
  const overtime = Object.values(empWeekly).reduce((s, h) => s + Math.max(0, h - 40), 0);

  const kpis = [
    {
      title:    "Active Now",
      value:    String(activeNow),
      subtitle: "employees active",
      icon:     Clock,
      color:    "hsl(var(--blue-vibrant))",
      bgClass:  "bg-blue-500/20",
    },
    {
      title:    "Total Hours",
      value:    totalHours.toFixed(1),
      subtitle: "hours worked",
      icon:     CalendarDays,
      color:    "hsl(var(--orange-vibrant))",
      bgClass:  "bg-orange-500/20",
    },
    {
      title:    "Pay Now",
      value:    `$${totalPay.toFixed(0)}`,
      subtitle: "pending payment",
      icon:     DollarSign,
      color:    "hsl(var(--green-vibrant))",
      bgClass:  "bg-green-500/20",
    },
    {
      title:    "Overtime",
      value:    overtime.toFixed(1),
      subtitle: "overtime hours",
      icon:     TrendingUp,
      color:    "hsl(var(--purple-vibrant))",
      bgClass:  "bg-purple-500/20",
    },
  ];

  return (
    <Card className="border border-border/50 shadow-none">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ title, value, subtitle, icon: Icon, color, bgClass }) => (
            <div key={title} className="border-l-4 pl-4" style={{ borderLeftColor: color }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${bgClass}`}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
