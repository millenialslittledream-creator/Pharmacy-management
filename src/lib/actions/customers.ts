"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";

export async function listCustomers(query?: string, page = 1, pageSize = 20) {
  const { supabase } = await requireOrgId();

  let q = supabase
    .from("customers")
    .select("id, name, phone, address, age, gender, loyalty_points, outstanding_balance, created_at", {
      count: "exact",
    })
    .order("name");

  if (query?.trim()) {
    q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw error;
  return { data, count: count ?? 0 };
}

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  address?: string;
  age?: number;
  gender?: string;
};

export async function createCustomer(input: CreateCustomerInput) {
  const { supabase, orgId } = await requireOrgId();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...input, org_id: orgId })
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/customers");
  return data;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput>) {
  const { supabase } = await requireOrgId();
  const { error } = await supabase.from("customers").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/customers");
}

export async function getCustomerDetail(id: string) {
  const { supabase } = await requireOrgId();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (customerError) throw customerError;

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_no, created_at, payment_mode, status, grand_total")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });
  if (invoicesError) throw invoicesError;

  return { customer, invoices };
}
