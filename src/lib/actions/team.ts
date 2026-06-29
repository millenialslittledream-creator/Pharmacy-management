"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/actions/require-org";
import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["user_role"];

export async function listTeamMembers() {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function listPendingInvites() {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, role, token, created_at, accepted_at")
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createInvite(email: string, role: Role) {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase.rpc("create_invite", { p_email: email, p_role: role });
  if (error) throw error;
  revalidatePath("/team");
  return data[0];
}

export async function revokeInvite(id: string) {
  const { supabase } = await requireOrgId();
  const { error } = await supabase.from("invites").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/team");
}

export async function getInviteByToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error) throw error;
  return data[0] ?? null;
}
