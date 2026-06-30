"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { requireOrgId } from "@/lib/actions/require-org";
import { sanitizeSearchTerm } from "@/lib/search";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import type { Database } from "@/lib/supabase/types";

type PaymentMode = Database["public"]["Enums"]["payment_mode"];

export async function listAvailableBatches(medicineId: string) {
  const { supabase } = await requireOrgId();
  const { data, error } = await supabase
    .from("medicine_batches")
    .select("id, batch_no, expiry_date, sale_rate, qty_in_stock")
    .eq("medicine_id", medicineId)
    .gt("qty_in_stock", 0)
    .order("expiry_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function searchCustomers(query: string) {
  const { supabase } = await requireOrgId();
  const term = sanitizeSearchTerm(query);
  if (!term) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
    .order("name")
    .limit(10);

  if (error) throw error;
  return data;
}

export async function createQuickCustomer(name: string, phone?: string) {
  const { supabase, orgId } = await requireOrgId();

  if (phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("org_id", orgId)
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ org_id: orgId, name, phone })
    .select("id, name, phone")
    .single();

  if (error) throw error;
  return data;
}

export type InvoiceLineInput = {
  medicine_batch_id: string;
  qty: number;
  unit_rate: number;
  discount_pct?: number;
  prescribing_doctor?: string;
  prescription_ref?: string;
};

export async function getInvoiceDetail(invoiceId: string) {
  const { supabase } = await requireOrgId();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, invoice_no, created_at, payment_mode, status, grand_total, discount_total, taxable_value, cgst_total, sgst_total, customers(name, phone), organizations(name, gstin, address, phone)",
    )
    .eq("id", invoiceId)
    .single();
  if (invoiceError) throw invoiceError;

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select(
      "id, qty, unit_rate, discount_pct, line_total, tax_rate, tax_amount, medicine_batches(batch_no, medicines(name, unit, hsn_code))",
    )
    .eq("invoice_id", invoiceId);
  if (itemsError) throw itemsError;

  return { invoice, items };
}

function generateInvoiceNo(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function submitInvoice(input: {
  customerId?: string;
  paymentMode: PaymentMode;
  discountTotal: number;
  items: InvoiceLineInput[];
}) {
  const { supabase, orgId, invoicePrefix } = await requireOrgId();

  const { data, error } = await supabase.rpc("create_invoice", {
    p_org_id: orgId,
    p_invoice_no: generateInvoiceNo(invoicePrefix),
    p_customer_id: input.customerId ?? null,
    p_payment_mode: input.paymentMode,
    p_discount_total: input.discountTotal,
    p_items: input.items.map((item) => ({
      medicine_batch_id: item.medicine_batch_id,
      qty: item.qty,
      unit_rate: item.unit_rate,
      discount_pct: item.discount_pct ?? 0,
      prescribing_doctor: item.prescribing_doctor || null,
      prescription_ref: item.prescription_ref || null,
    })),
  });

  if (error) throw error;
  revalidatePath("/billing");
  revalidatePath("/inventory");
  updateTag(`dashboard-${orgId}`);

  if (input.customerId) {
    after(() => notifyInvoiceByWhatsApp(orgId, input.customerId!, data));
  }

  return data;
}

async function notifyInvoiceByWhatsApp(orgId: string, customerId: string, invoiceId: string) {
  const { supabase } = await requireOrgId();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, gstin, address, phone, whatsapp_enabled")
    .eq("id", orgId)
    .single();
  if (!org?.whatsapp_enabled) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("name, phone")
    .eq("id", customerId)
    .single();
  if (!customer?.phone) return;

  const { invoice, items } = await getInvoiceDetail(invoiceId);

  const pdfBuffer = await generateInvoicePdf(invoice, items, org, customer);

  await sendWhatsAppMessage(
    customer.phone,
    `${org.name}: Your bill ${invoice.invoice_no} for ₹${invoice.grand_total.toFixed(2)} is ready. Thank you for your purchase!`,
    { buffer: pdfBuffer, fileName: `${invoice.invoice_no}.pdf` },
  );
}

export type InvoiceFilters = {
  from?: string;
  to?: string;
  customerName?: string;
  paymentMode?: PaymentMode;
  status?: Database["public"]["Enums"]["invoice_status"];
};

export async function listInvoices(filters: InvoiceFilters, page = 1, pageSize = 20) {
  const { supabase } = await requireOrgId();

  // customerName is matched client-side against the joined relation, so when
  // it's set we pull a wider window and paginate the filtered result in memory.
  const hasNameFilter = Boolean(filters.customerName);

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_no, created_at, payment_mode, status, grand_total, discount_total, customers(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.paymentMode) query = query.eq("payment_mode", filters.paymentMode);
  if (filters.status) query = query.eq("status", filters.status);

  if (hasNameFilter) {
    const { data, error } = await query.limit(500);
    if (error) throw error;
    const needle = filters.customerName!.toLowerCase();
    const filtered = data.filter((inv) =>
      (inv.customers as unknown as { name: string } | null)?.name
        ?.toLowerCase()
        .includes(needle),
    );
    const from = (page - 1) * pageSize;
    return { data: filtered.slice(from, from + pageSize), count: filtered.length };
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { data, count: count ?? 0 };
}

export async function returnInvoice(invoiceId: string) {
  const { supabase, orgId } = await requireOrgId();
  const { error } = await supabase.rpc("return_invoice", { p_invoice_id: invoiceId });
  if (error) throw error;
  revalidatePath("/billing");
  revalidatePath("/inventory");
  updateTag(`dashboard-${orgId}`);
}
