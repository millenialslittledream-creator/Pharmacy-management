"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";

export async function getOrgSettings() {
  const { supabase, orgId } = await requireOrgId();
  const { data, error } = await supabase
    .from("organizations")
    .select("name, gstin, address, phone, invoice_prefix, default_reorder_level")
    .eq("id", orgId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrgSettings(input: {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  invoicePrefix: string;
  defaultReorderLevel: number;
}) {
  const { supabase, orgId } = await requireOrgId();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: input.name,
      gstin: input.gstin || null,
      address: input.address || null,
      phone: input.phone || null,
      invoice_prefix: input.invoicePrefix || "INV",
      default_reorder_level: input.defaultReorderLevel,
    })
    .eq("id", orgId);
  if (error) throw error;
  revalidatePath("/settings");
}
