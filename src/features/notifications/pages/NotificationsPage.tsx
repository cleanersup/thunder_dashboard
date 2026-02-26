import { Bell, CheckCheck, Trash2, XCircle, DollarSign, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { useNotifications } from "../hooks/useNotifications";
import { getRelativeTime } from "@/shared/utils/formatters";
import type { Notification } from "../types/notification.types";

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "invoice_paid": case "estimate_accepted": return <CheckCheck className="w-4 h-4" style={{ color: "hsl(var(--green-vibrant))" }} />;
    case "invoice_canceled": case "estimate_canceled": return <XCircle className="w-4 h-4 text-destructive" />;
    case "booking_new": return <Bell className="w-4 h-4" style={{ color: "hsl(var(--blue-vibrant))" }} />;
    case "payment": return <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--green-vibrant))" }} />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function NotificationItem({ notification, onRead, onDelete }: { notification: Notification; onRead: () => void; onDelete: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onRead}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted cursor-pointer transition-colors ${!notification.read ? "bg-primary/5" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${!notification.read ? "font-semibold" : "font-medium"}`}>{notification.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{getRelativeTime(notification.created_at)}</p>
      </div>
      <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, markRead, markAllRead, remove } = useNotifications();

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="p-2.5 space-y-2.5 max-w-2xl">
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" />
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="You'll see updates about invoices, estimates, and bookings here." />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {unread.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">NEW</span>
              </div>
              <ScrollArea>
                {unread.map((n) => (
                  <NotificationItem
                    key={n.id} notification={n}
                    onRead={() => markRead.mutate(n.id)}
                    onDelete={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                  />
                ))}
              </ScrollArea>
            </>
          )}
          {read.length > 0 && (
            <>
              <div className="px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earlier</span>
              </div>
              <ScrollArea>
                {read.map((n) => (
                  <NotificationItem
                    key={n.id} notification={n}
                    onRead={() => markRead.mutate(n.id)}
                    onDelete={(e) => { e.stopPropagation(); remove.mutate(n.id); }}
                  />
                ))}
              </ScrollArea>
            </>
          )}
        </div>
      )}
    </div>
  );
}
