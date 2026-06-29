import { createClient } from "@/lib/supabase/server";

export async function requireOrgId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("No profile found");

  return { supabase, orgId: profile.org_id, role: profile.role };
}
