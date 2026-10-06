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
    .select("full_name, org_id, role, organizations(name, invoice_prefix)")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile: profile ?? null };
});

export async function requireOrgId() {
  const { supabase, user, profile } = await getAuthContext();
  if (!profile || !user) throw new Error("Not authenticated");

  const org = profile.organizations as unknown as { name: string; invoice_prefix: string } | null;
  return { supabase, userId: user.id, orgId: profile.org_id, role: profile.role, invoicePrefix: org?.invoice_prefix ?? "INV" };
}
