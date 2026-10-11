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
  const { supabase } = await requireOrgId();

  // Balance and invoice updates happen atomically in the database; the old
  // client-side read-then-write could be raced and let callers write any value.
  const { error } = input.invoiceId
    ? await supabase.rpc("record_payment", {
        p_invoice_id: input.invoiceId,
        p_amount: input.amount,
        p_method: input.method,
      })
    : await supabase.rpc("record_customer_payment", {
        p_customer_id: input.customerId,
        p_amount: input.amount,
        p_method: input.method,
      });
  if (error) throw new Error(error.message);

  revalidatePath(`/customers/${input.customerId}`);
  revalidatePath("/billing");
}
