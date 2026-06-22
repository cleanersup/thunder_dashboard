import { supabase } from "@/integrations/supabase/client";
import type { NotificationType } from "../types/notification.types";

/**
 * Fetches the most recent 50 notifications for the authenticated user.
 */
export async function fetchNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/**
 * Marks a single notification as read.
 * @param id - Notification UUID
 */
export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Marks all notifications as read for the authenticated user.
 */
export async function markAllNotificationsAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) throw error;
}

/**
 * Deletes a notification by ID.
 * @param id - Notification UUID
 */
export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Creates a new notification for a user.
 * @param params - Notification creation params
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    related_id: params.relatedId,
    related_type: params.relatedType,
    read: false,
  });
  if (error) throw error;
}
