/**
 * @module useDashboardStats
 * React Query hooks that fetch and derive all data needed by DashboardPage.
 * Computation (chart data, aggregates) lives here so page components stay thin.
 */

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  endOfWeek,
  format as formatDate,
  isWithinInterval,
  subMonths,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchClientsCount,
  fetchEmployeesCount,
  fetchLeadsCount,
  fetchBookingsCount,
  fetchActivities,
  fetchTodayRoutes,
} from "../services/dashboardService";
import { fetchInvoices } from "../../invoices/services/invoicesService";
import { fetchEstimates } from "../../estimates/services/estimatesService";
import { getUserTimezone, getCurrentDateInTimezone } from "@/shared/utils/formatters";
import type { SparklinePoint, WeeklySalesPoint, PendingByMonthPoint } from "../types/dashboard.types";
import { QK } from "@/shared/config/queryKeys";

/**
 * Master hook that provides all dashboard data and derived chart series.
 * Subscribes to Supabase realtime channels for invoices and notifications.
 *
 * @returns All stats, chart data, and loading states needed by DashboardPage
 */
export function useDashboardStats() {
  const queryClient = useQueryClient();
  const userTimezone = useMemo(() => getUserTimezone(), []);
  const today = useMemo(() => getCurrentDateInTimezone(userTimezone), [userTimezone]);
  const now = useMemo(() => new Date(), []);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: QK.invoices,
    queryFn: fetchInvoices,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allEstimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: QK.estimates,
    queryFn: fetchEstimates,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: QK.activities,
    queryFn: fetchActivities,
    staleTime: 60 * 1000, // 1 minute — activities change often
  });

  const { data: todayRoutes = [], isLoading: routesLoading } = useQuery({
    queryKey: QK.todayRoutes(today),
    queryFn: () => fetchTodayRoutes(today),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientsCount = 0 } = useQuery({
    queryKey: QK.clientsCount,
    queryFn: fetchClientsCount,
    staleTime: 5 * 60 * 1000,
  });

  const { data: employeesCount = 0 } = useQuery({
    queryKey: QK.employeesCount,
    queryFn: fetchEmployeesCount,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leadsCount = 0 } = useQuery({
    queryKey: QK.leadsCount,
    queryFn: fetchLeadsCount,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bookingsCount = 0 } = useQuery({
    queryKey: QK.bookingsCount,
    queryFn: fetchBookingsCount,
    staleTime: 5 * 60 * 1000,
  });

  // ── Realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const invoicesChannel = supabase
      .channel("dashboard-invoices")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        queryClient.invalidateQueries({ queryKey: QK.invoices });
        queryClient.invalidateQueries({ queryKey: QK.activities });
      })
      .subscribe();

    return () => { supabase.removeChannel(invoicesChannel); };
  }, [queryClient]);

  // ── Derived invoice stats ─────────────────────────────────────────────────

  const pendingInvoices = useMemo(
    () => allInvoices.filter((inv) => inv.status === "Pending"),
    [allInvoices],
  );

  const pendingInvoicesTotal = useMemo(
    () => pendingInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
    [pendingInvoices],
  );

  const monthlyRevenue = useMemo(() => {
    const m = now.getMonth();
    const y = now.getFullYear();
    return allInvoices
      .filter((inv) => {
        if (inv.status !== "Paid" || !inv.paid_date) return false;
        const d = new Date(inv.paid_date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0);
  }, [allInvoices, now]);

  // ── Derived estimate stats ────────────────────────────────────────────────

  const pendingEstimates = useMemo(
    () => allEstimates.filter((e) => e.status === "Pending"),
    [allEstimates],
  );

  const pendingEstimatesTotal = useMemo(
    () => pendingEstimates.reduce((s, e) => s + (Number(e.total) || 0), 0),
    [pendingEstimates],
  );

  // ── Routes today ─────────────────────────────────────────────────────────

  const totalRoutesServices = useMemo(
    () => todayRoutes.reduce((s, r) => s + r.serviceCount, 0),
    [todayRoutes],
  );

  // ── Sparkline: 3-month cumulative weekly revenue ──────────────────────────

  const sparklineData = useMemo((): SparklinePoint[] => {
    const threeMonthsAgo = subMonths(now, 3);
    const weeks = eachWeekOfInterval(
      { start: threeMonthsAgo, end: now },
      { weekStartsOn: 0 },
    );
    let cumulative = 0;
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const weekSales = allInvoices
        .filter((inv) => {
          if (inv.status !== "Paid" || !inv.paid_date) return false;
          return isWithinInterval(new Date(inv.paid_date), { start: weekStart, end: weekEnd });
        })
        .reduce((s, inv) => s + (Number(inv.total) || 0), 0);
      cumulative += weekSales;
      return {
        name: formatDate(weekStart, "MMM d"),
        value: cumulative,
        weekSales,
        label: `${formatDate(weekStart, "MMM d")} - ${formatDate(weekEnd, "MMM d")}`,
      };
    });
  }, [allInvoices, now]);

  // ── Weekly sales: current month by week (bar chart) ───────────────────────

  const weeklySalesData = useMemo((): WeeklySalesPoint[] => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 }).slice(0, 4);
    return weeks.map((weekStart, i) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const sales = allInvoices
        .filter((inv) => {
          if (inv.status !== "Paid" || !inv.paid_date) return false;
          return isWithinInterval(new Date(inv.paid_date), { start: weekStart, end: weekEnd });
        })
        .reduce((s, inv) => s + (Number(inv.total) || 0), 0);
      return {
        name: `Week ${i + 1}`,
        sales,
        label: `${formatDate(weekStart, "MMM d")} - ${formatDate(weekEnd, "MMM d")}`,
      };
    });
  }, [allInvoices, now]);

  // ── Pending invoices last 6 months (bar chart) ────────────────────────────

  const pendingByMonthData = useMemo((): PendingByMonthPoint[] => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const pending = allInvoices.filter((inv) => {
        if (inv.status !== "Pending") return false;
        const d = new Date(inv.invoice_date);
        return d >= monthStart && d <= monthEnd;
      });
      return {
        name: formatDate(monthDate, "MMM"),
        count: pending.length,
        total: pending.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
        fullDate: formatDate(monthDate, "MMMM yyyy"),
      };
    });
  }, [allInvoices, now]);

  // ── Last-week percentage change ───────────────────────────────────────────

  const lastWeekPercent = useMemo(() => {
    if (sparklineData.length === 0 || !monthlyRevenue) return "+0.00%";
    const lastWeekSales = sparklineData[sparklineData.length - 1]?.weekSales ?? 0;
    if (lastWeekSales === 0) return "+0.00%";
    return `+${((lastWeekSales / monthlyRevenue) * 100).toFixed(2)}%`;
  }, [sparklineData, monthlyRevenue]);

  return {
    // Raw
    allInvoices,
    recentActivities,
    todayRoutes,
    // Counts
    clientsCount,
    employeesCount,
    leadsCount,
    bookingsCount,
    // Aggregates
    monthlyRevenue,
    pendingInvoicesTotal,
    pendingInvoicesCount: pendingInvoices.length,
    pendingEstimatesTotal,
    pendingEstimatesCount: pendingEstimates.length,
    totalRoutesServices,
    routesCount: todayRoutes.length,
    // Chart data
    sparklineData,
    weeklySalesData,
    pendingByMonthData,
    lastWeekPercent,
    // Meta
    today,
    now,
    // Loading
    invoicesLoading,
    estimatesLoading,
    activitiesLoading,
    routesLoading,
    isLoading: invoicesLoading || estimatesLoading,
  };
}
