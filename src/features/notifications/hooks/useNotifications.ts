import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "../services/notificationsService";

export function useNotifications() {
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });

  // Realtime subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      channel = supabase
        .channel("notifications-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        })
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [qc]);

  const markRead = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const remove = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { ...query, markRead, markAllRead, remove };
}
