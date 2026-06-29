"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";

const MAX_QUICK_PICKS = 7;

export async function listQuickPicks() {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("quick_picks")
    .select("id, position, medicines(id, name, default_sale_rate, unit, schedule_category)")
    .order("position");

  if (error) throw error;
  return data;
}

export async function addQuickPick(medicineId: string) {
  const { supabase, orgId } = await requireOrgId();

  const { count } = await supabase
    .from("quick_picks")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) >= MAX_QUICK_PICKS) {
    throw new Error(`You can only have ${MAX_QUICK_PICKS} quick-add medicines`);
  }

  const { error } = await supabase
    .from("quick_picks")
    .insert({ org_id: orgId, medicine_id: medicineId, position: (count ?? 0) + 1 });

  if (error) throw error;
  revalidatePath("/billing");
}

export async function removeQuickPick(id: string) {
  const { supabase } = await requireOrgId();
  const { error } = await supabase.from("quick_picks").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/billing");
}
