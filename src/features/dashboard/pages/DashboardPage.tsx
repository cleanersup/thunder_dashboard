import { useNavigate } from "react-router-dom";
import { DollarSign, Users, Receipt, Route } from "lucide-react";
import { format as formatDate } from "date-fns";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { StatCardSkeleton } from "@/shared/components/common/SkeletonCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { StatsCard } from "../components/StatsCard";
import { RevenueChart } from "../components/RevenueChart";
import { WeeklySalesChart } from "../components/WeeklySalesChart";
import { PendingInvoicesChart } from "../components/PendingInvoicesChart";
import { ActivityFeed } from "../components/ActivityFeed";
import { TodayRoutes } from "../components/TodayRoutes";
import { formatCurrency } from "@/shared/utils/formatters";
import { useProfile } from "@/shared/hooks/useProfile";

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
  const { data: profile } = useProfile();
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
    now,
    invoicesLoading,
    activitiesLoading,
    routesLoading,
    isLoading,
  } = useDashboardStats();

  const greeting = profile?.first_name ? `Welcome back, ${profile.first_name}` : "Dashboard";

  return (
    <div className="p-2.5 space-y-2.5 pb-24 lg:pb-4">
      <PageHeader
        title={greeting}
        subtitle={formatDate(now, "EEEE, MMMM d, yyyy")}
      />

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
              colorClass="bg-blue-600 text-white"
              onClick={() => navigate("/invoices")}
            />
            <StatsCard
              label="Active Clients"
              value={String(clientsCount)}
              subtext="Total active clients"
              icon={Users}
              colorClass="bg-green-600 text-white"
              onClick={() => navigate("/crm")}
            />
            <StatsCard
              label="Pending Estimates"
              value={String(pendingEstimatesCount)}
              subtext={`Worth $${formatCurrency(pendingEstimatesTotal)}`}
              icon={Receipt}
              colorClass="bg-purple-600 text-white"
              onClick={() => navigate("/estimates")}
            />
            <StatsCard
              label="Routes Today"
              value={String(totalRoutesServices)}
              subtext={`${routesCount} route${routesCount !== 1 ? "s" : ""} scheduled`}
              icon={Route}
              colorClass="bg-orange-500 text-white"
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
        <TodayRoutes routes={todayRoutes} isLoading={routesLoading} />
        <ActivityFeed activities={recentActivities} isLoading={activitiesLoading} />
      </div>
    </div>
  );
}
