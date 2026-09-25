"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";

export async function listNotifications(limit = 20) {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getUnreadNotificationCount() {
  const { supabase } = await requireOrgId();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const { supabase } = await requireOrgId();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { supabase } = await requireOrgId();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
  revalidatePath("/", "layout");
}
