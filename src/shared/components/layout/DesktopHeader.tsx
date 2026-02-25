import { Bell, Globe, ChevronDown, CheckCheck, Clock, DollarSign, XCircle, Trash2 } from "lucide-react";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/shared/hooks/useProfile";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

/** Returns an icon component for a notification type. */
function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "invoice_paid":
    case "estimate_accepted":
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

/** Formats an ISO date string as a relative time label (e.g. "2 hours ago"). */
function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Desktop top header — hidden on mobile (lg:flex).
 * Shows a welcome message, notification bell with real-time badge, language selector, and user avatar menu.
 */
export function DesktopHeader() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Unread count + realtime updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const loadUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };

    loadUnread();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel("header-notifications")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
          loadUnread();
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        })
        .subscribe();
    });

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [queryClient]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile/tablet when sidebar is a Sheet */}
        <SidebarTrigger className="lg:hidden" />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Welcome back</span>
          <span className="text-sm font-semibold text-foreground">
            {profile?.company_name ?? "Your Company"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-background">
            <div className="px-3 py-2 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`px-3 py-2 hover:bg-muted cursor-pointer flex gap-3 items-start ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <NotificationIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getRelativeTime(n.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full text-primary hover:text-primary" onClick={() => navigate("/notifications")}>
                    View all notifications
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language selector (placeholder) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Globe className="h-4 w-4" />
              <span>English</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>English</DropdownMenuItem>
            <DropdownMenuItem>Español</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.company_logo ?? ""} alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.first_name?.[0] ?? "U"}{profile?.last_name?.[0] ?? ""}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/edit-company-info")}>Company Info</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
