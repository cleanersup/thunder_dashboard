import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ChartSkeleton } from "@/shared/components/common/SkeletonCard";
import { formatCurrency } from "@/shared/utils/formatters";
import type { SparklinePoint } from "../types/dashboard.types";

interface RevenueChartProps {
  monthlyRevenue: number;
  sparklineData: SparklinePoint[];
  lastWeekPercent: string;
  isLoading: boolean;
}

/**
 * Monthly revenue card with a 3-month cumulative AreaChart sparkline.
 *
 * @param monthlyRevenue - Current month's total paid revenue
 * @param sparklineData - Weekly cumulative revenue data for the last 3 months
 * @param lastWeekPercent - Percentage string for the last-week trend (e.g. "+12.50%")
 * @param isLoading - Shows skeleton while data is loading
 */
export function RevenueChart({ monthlyRevenue, sparklineData, lastWeekPercent, isLoading }: RevenueChartProps) {
  if (isLoading) return <ChartSkeleton height={200} />;

  return (
    <Card className="border-0 flex flex-col">
      <CardContent className="p-5 flex-1 flex flex-col">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
          Monthly Revenue
        </p>
        <h2 className="text-[32px] font-bold text-foreground leading-none">
          ${formatCurrency(monthlyRevenue)}
        </h2>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-[11px] text-green-600 font-medium">{lastWeekPercent}</span>
        </div>

        <ResponsiveContainer width="100%" height={180} className="mt-auto">
          <AreaChart data={sparklineData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220,90%,56%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(220,90%,56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.15}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              interval="preserveEnd"
              minTickGap={20}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-lg">
                    <p className="text-[10px] text-muted-foreground">{payload[0].payload.label}</p>
                    <p className="text-xs font-semibold">${formatCurrency(payload[0].value as number)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(220,90%,56%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
