"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";
import type { Database } from "@/lib/supabase/types";

type PaymentMode = Database["public"]["Enums"]["payment_mode"];

export async function listPayments(customerId: string) {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, created_at, invoice_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function recordPayment(input: {
  customerId: string;
  amount: number;
  method: PaymentMode;
  invoiceId?: string;
}) {
  const { supabase, orgId } = await requireOrgId();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("outstanding_balance")
    .eq("id", input.customerId)
    .single();
  if (customerError) throw customerError;

  const { error: insertError } = await supabase.from("payments").insert({
    org_id: orgId,
    customer_id: input.customerId,
    invoice_id: input.invoiceId ?? null,
    amount: input.amount,
    method: input.method,
  });
  if (insertError) throw insertError;

  const newBalance = Math.max(0, customer.outstanding_balance - input.amount);
  const { error: updateError } = await supabase
    .from("customers")
    .update({ outstanding_balance: newBalance })
    .eq("id", input.customerId);
  if (updateError) throw updateError;

  revalidatePath(`/customers/${input.customerId}`);
}
