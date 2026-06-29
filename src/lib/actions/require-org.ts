import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard layout and every page/action under it each need the current
 * user's profile. React's cache() dedupes these into a single Supabase
 * round trip per request instead of one per call site.
 */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, org_id, role, organizations(name)")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile: profile ?? null };
});

export async function requireOrgId() {
  const { supabase, profile } = await getAuthContext();
  if (!profile) throw new Error("Not authenticated");

  return { supabase, orgId: profile.org_id, role: profile.role };
}
