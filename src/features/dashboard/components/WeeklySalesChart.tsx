import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format as formatDate } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ChartSkeleton } from "@/shared/components/common/SkeletonCard";
import { formatCurrency } from "@/shared/utils/formatters";
import type { WeeklySalesPoint } from "../types/dashboard.types";

interface WeeklySalesChartProps {
  data: WeeklySalesPoint[];
  now: Date;
  isLoading: boolean;
}

/**
 * Bar chart showing paid invoice totals by week for the current month.
 *
 * @param data - Weekly sales data points
 * @param now - Current date (used for chart title month label)
 * @param isLoading - Shows skeleton while data is loading
 */
export function WeeklySalesChart({ data, now, isLoading }: WeeklySalesChartProps) {
  if (isLoading) return <ChartSkeleton height={200} />;

  const total = data.reduce((s, w) => s + w.sales, 0);

  return (
    <Card className="border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Weekly Sales — {formatDate(now, "MMMM yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, _name: string, props: { payload?: WeeklySalesPoint }) => [
                `$${formatCurrency(value as number)}`,
                props.payload?.label ?? "",
              ]}
            />
            <Bar dataKey="sales" fill="hsl(var(--green-vibrant))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total: ${formatCurrency(total)}</p>
          <p className="text-xs flex items-center gap-1 text-green-600">
            <TrendingUp className="w-3 h-3" />
            Paid Invoices
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
