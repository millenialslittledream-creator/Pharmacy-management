"use server";

import { requireOrgId } from "@/lib/actions/require-org";

export async function getScheduledDrugRegister(from: string, to: string) {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("scheduled_drug_register")
    .select("*")
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
