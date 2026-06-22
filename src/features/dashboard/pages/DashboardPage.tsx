import { useNavigate } from "react-router-dom";
import { DollarSign, Users, Receipt, Route } from "lucide-react";
import { StatCardSkeleton } from "@/shared/components/common/SkeletonCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { StatsCard } from "../components/StatsCard";
import { RevenueChart } from "../components/RevenueChart";
import { WeeklySalesChart } from "../components/WeeklySalesChart";
import { PendingInvoicesChart } from "../components/PendingInvoicesChart";
import { ActivityFeed } from "../components/ActivityFeed";
import { TodayRoutes } from "../components/TodayRoutes";
import { formatCurrency } from "@/shared/utils/formatters";

/**
 * DashboardPage — main home screen for authenticated users.
 *
 * Desktop layout (≥1024px):
 *   Row 1: 4 stat cards
 *   Row 2: Weekly Sales chart | Revenue sparkline card
 *   Row 3: Pending Invoices chart | Today's Routes | Activity Feed
 *
 * Mobile layout (<1024px):
 *   Stacked: stat cards (2-col grid), charts, routes, activity
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    clientsCount,
    monthlyRevenue,
    pendingEstimatesCount,
    pendingEstimatesTotal,
    totalRoutesServices,
    routesCount,
    sparklineData,
    weeklySalesData,
    pendingByMonthData,
    lastWeekPercent,
    recentActivities,
    todayRoutes,
    today,
    now,
    invoicesLoading,
    activitiesLoading,
    routesLoading,
    isLoading,
  } = useDashboardStats();

  return (
    <div className="p-2.5 space-y-2.5 pb-24 lg:pb-4">
      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              label="Monthly Revenue"
              value={`$${formatCurrency(monthlyRevenue)}`}
              subtext={`${lastWeekPercent} from last week`}
              icon={DollarSign}
              colorClass="bg-info text-info-foreground"
              onClick={() => navigate("/invoices")}
            />
            <StatsCard
              label="Active Clients"
              value={String(clientsCount)}
              subtext="Total active clients"
              icon={Users}
              colorClass="bg-success text-success-foreground"
              onClick={() => navigate("/crm")}
            />
            <StatsCard
              label="Pending Estimates"
              value={String(pendingEstimatesCount)}
              subtext={`Worth $${formatCurrency(pendingEstimatesTotal)}`}
              icon={Receipt}
              colorClass="bg-purple-vibrant text-white"
              onClick={() => navigate("/estimates")}
            />
            <StatsCard
              label="Routes Today"
              value={String(totalRoutesServices)}
              subtext={`${routesCount} route${routesCount !== 1 ? "s" : ""} scheduled`}
              icon={Route}
              colorClass="bg-warning text-warning-foreground"
              onClick={() => navigate("/create-route")}
            />
          </>
        )}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-2.5">
        <WeeklySalesChart data={weeklySalesData} now={now} isLoading={invoicesLoading} />
        <RevenueChart
          monthlyRevenue={monthlyRevenue}
          sparklineData={sparklineData}
          lastWeekPercent={lastWeekPercent}
          isLoading={invoicesLoading}
        />
      </div>

      {/* ── Bottom row: pending chart + routes + activity ──────────────── */}
      <div className="grid lg:grid-cols-3 gap-2.5">
        <PendingInvoicesChart data={pendingByMonthData} isLoading={invoicesLoading} />
        <TodayRoutes routes={todayRoutes} isLoading={routesLoading} today={today} />
        <ActivityFeed activities={recentActivities} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
