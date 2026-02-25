import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ChartSkeleton } from "@/shared/components/common/SkeletonCard";
import { formatCurrency } from "@/shared/utils/formatters";
import type { PendingByMonthPoint } from "../types/dashboard.types";

interface PendingInvoicesChartProps {
  data: PendingByMonthPoint[];
  isLoading: boolean;
}

/**
 * Bar chart showing pending invoice counts by month for the last 6 months.
 *
 * @param data - Monthly pending invoice data points
 * @param isLoading - Shows skeleton while data is loading
 */
export function PendingInvoicesChart({ data, isLoading }: PendingInvoicesChartProps) {
  if (isLoading) return <ChartSkeleton height={200} />;

  return (
    <Card className="border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Pending Invoices — Last 6 Months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, _name: string, props: { payload?: PendingByMonthPoint }) => [
                `${value} invoices — $${formatCurrency(props.payload?.total ?? 0)}`,
                props.payload?.fullDate ?? "",
              ]}
            />
            <Bar dataKey="count" fill="hsl(var(--orange-vibrant,30 100% 50%))" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
