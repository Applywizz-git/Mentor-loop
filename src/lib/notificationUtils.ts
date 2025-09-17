// src/utils/notificationUtils.ts
import { supabase } from "@/lib/supabase"; // ✅ reuse singleton client

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    console.error("Error marking notification as read:", err);
    return { success: false, error: err.message };
  }
};

// Fetch unread notifications for a specific user
export const fetchUnreadNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false }); // optional: latest first

    if (error) throw new Error(error.message);

    return data || [];
  } catch (err: any) {
    console.error("Error fetching unread notifications:", err);
    return [];
  }
};
