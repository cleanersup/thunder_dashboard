import {
  Bell, FileText, DollarSign, CheckCircle, XCircle,
  MapPin, TrendingUp, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ActivitySkeleton } from "@/shared/components/common/SkeletonCard";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { getRelativeTime, formatCurrency } from "@/shared/utils/formatters";
import type { Activity, ActivityType } from "../types/dashboard.types";

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "estimate_created":
    case "estimate_sent":
    case "invoice_created":
    case "invoice_sent":
      return FileText;
    case "estimate_accepted":
    case "task_completed":
      return CheckCircle;
    case "estimate_canceled":
    case "invoice_canceled":
      return XCircle;
    case "invoice_paid":
      return DollarSign;
    case "route_created":
    case "appointment_created":
    case "appointment_updated":
      return MapPin;
    case "booking_received":
    case "booking_updated":
      return Bell;
    case "lead_created":
    case "lead_updated":
    case "client_created":
    case "client_updated":
      return TrendingUp;
    case "task_created":
      return Clock;
    default:
      return Bell;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case "estimate_accepted":
    case "invoice_paid":
    case "task_completed":
      return "text-green-600 bg-green-50";
    case "estimate_canceled":
    case "invoice_canceled":
      return "text-destructive bg-destructive/10";
    case "estimate_created":
    case "estimate_sent":
    case "invoice_created":
    case "invoice_sent":
      return "text-blue-600 bg-blue-50";
    case "route_created":
    case "appointment_created":
    case "appointment_updated":
      return "text-purple-600 bg-purple-50";
    case "booking_received":
    case "booking_updated":
      return "text-orange-600 bg-orange-50";
    case "lead_created":
    case "lead_updated":
    case "client_created":
    case "client_updated":
      return "text-yellow-600 bg-yellow-50";
    default:
      return "text-blue-600 bg-blue-50";
  }
}

/**
 * Today's activity feed showing recent actions across all features.
 *
 * @param activities - List of today's Activity records
 * @param isLoading - Shows skeleton while data is loading
 */
export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  return (
    <Card className="border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Today's Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-5 pb-4">
            <ActivitySkeleton />
          </div>
        ) : activities.length === 0 ? (
          <div className="px-5 pb-4">
            <EmptyState
              icon={Bell}
              title="No activity today"
              description="Actions like creating invoices, estimates, or routes will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              return (
                <li key={activity.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activity.amount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          ${formatCurrency(activity.amount)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
