import { Bell, CheckCheck, Trash2, XCircle, DollarSign, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { useNotifications } from "../hooks/useNotifications";
import { getRelativeTime } from "@/shared/utils/formatters";
import type { Notification } from "../types/notification.types";

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "invoice_paid":
    case "estimate_accepted":
    case "contract_accepted":
      return <CheckCheck className="w-4 h-4" style={{ color: "hsl(var(--green-vibrant))" }} />;
    case "invoice_canceled":
    case "estimate_canceled":
      return <XCircle className="w-4 h-4 text-destructive" />;
    case "booking_new":
      return <Bell className="w-4 h-4" style={{ color: "hsl(var(--blue-vibrant))" }} />;
    case "payment":
      return <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--green-vibrant))" }} />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/50">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium leading-none">
          {count}
        </span>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isUnread = !notification.read;

  return (
    <div
      onClick={onRead}
      className={`flex items-start gap-3 px-4 py-4 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
        isUnread ? "bg-primary/5" : ""
      }`}
    >
      {/* Unread dot */}
      <div className="w-2 flex-shrink-0 flex justify-center pt-2">
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUnread ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-sm leading-snug ${
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
            {getRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
          {notification.message}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0 mt-0.5"
      >
        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, markRead, markAllRead, remove } = useNotifications();

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) => n.read);

  return (
    <div className="min-h-full bg-background p-2.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <PageHeader title="Notifications" />
        {unread.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You'll see updates about invoices, estimates, contracts, and bookings here."
        />
      ) : (
        <Card className="border border-border/50 shadow-none overflow-hidden">
          {unread.length > 0 && (
            <>
              <SectionHeader label="New" count={unread.length} />
              {unread.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markRead.mutate(n.id)}
                  onDelete={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                />
              ))}
            </>
          )}

          {read.length > 0 && (
            <>
              {/* Divider between sections when both exist */}
              {unread.length > 0 && <div className="h-px bg-border mx-4" />}
              <SectionHeader label="Earlier" />
              {read.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markRead.mutate(n.id)}
                  onDelete={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                />
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
