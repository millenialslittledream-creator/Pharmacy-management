"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgId } from "@/lib/actions/require-org";
import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["user_role"];

export async function listTeamMembers() {
  const { supabase, role } = await requireOrgId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, last_seen_at")
    .order("created_at");
  if (error) throw error;

  // Login emails and sign-in times live in auth.users, so only the CEO gets
  // them (to know what to share with a teammate / who is in use) and only
  // via the admin API.
  if (role !== "ceo") {
    return data.map((m) => ({
      ...m,
      email: null as string | null,
      last_sign_in_at: null as string | null,
    }));
  }
  const admin = createAdminClient();
  return Promise.all(
    data.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.id);
      return {
        ...m,
        email: u.user?.email ?? null,
        last_sign_in_at: u.user?.last_sign_in_at ?? null,
      };
    }),
  );
}

// Passwords are stored as one-way hashes, so they can't be viewed — the CEO
// sets a new one and shares it with the teammate.
export async function resetTeammatePassword(profileId: string, newPassword: string) {
  const { orgId, role } = await requireOrgId();
  if (role !== "ceo") throw new Error("Only the CEO can reset teammate passwords");
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, org_id, role")
    .eq("id", profileId)
    .single();
  if (!target || target.org_id !== orgId) throw new Error("Teammate not found");
  if (target.role === "ceo") throw new Error("The CEO's password can't be reset from here");

  const { error } = await admin.auth.admin.updateUserById(profileId, { password: newPassword });
  if (error) throw new Error(error.message);
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

// Bypasses Supabase's email-confirmation flow entirely (which is what hits
// the free-tier email rate limit) by creating the auth user pre-confirmed
// via the admin API, then attaching a profile directly — no invite link,
// no email sent. CEO sets the password themselves and shares it with the
// teammate out of band; the teammate can change it later from their own
// account settings once that exists.
export async function createTeammateDirect(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}) {
  const { orgId, role: callerRole } = await requireOrgId();
  if (callerRole !== "ceo") throw new Error("Only the CEO can add teammates directly");
  if (input.role === "ceo") throw new Error("Cannot create another CEO this way");
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters");

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
  });
  if (createError) throw new Error(createError.message);

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    org_id: orgId,
    full_name: input.fullName.trim(),
    role: input.role,
  });
  if (profileError) {
    // Roll back the orphaned auth user so a failed attempt doesn't leave a
    // half-created account blocking that email address from retrying.
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/team");
}

export async function getInviteByToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error) throw error;
  return data[0] ?? null;
}
