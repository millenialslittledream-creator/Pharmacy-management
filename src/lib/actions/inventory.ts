"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";
import { sanitizeSearchTerm } from "@/lib/search";

export async function searchMedicines(query: string) {
  const { supabase, orgId } = await requireOrgId();
  const term = sanitizeSearchTerm(query);
  if (!term) return [];

  const { data, error } = await supabase
    .from("medicines")
    .select("id, name, generic_name, manufacturer, unit, default_sale_rate, barcode")
    .eq("org_id", orgId)
    .or(`name.ilike.%${term}%,generic_name.ilike.%${term}%,barcode.ilike.%${term}%`)
    .order("name")
    .limit(15);

  if (error) throw error;
  return data;
}

export async function findMedicineByBarcode(barcode: string) {
  const { supabase, orgId } = await requireOrgId();
  const { data, error } = await supabase
    .from("medicines")
    .select("id, name, generic_name, manufacturer, unit, default_sale_rate, barcode")
    .eq("org_id", orgId)
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CreateMedicineInput = {
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  unit?: string;
  pack_size?: string;
  hsn_code?: string;
  reorder_level?: number;
  default_purchase_rate?: number;
  default_sale_rate?: number;
  schedule_category?: string;
  barcode?: string;
};

export async function createMedicine(input: CreateMedicineInput) {
  const { supabase, orgId } = await requireOrgId();

  const { data, error } = await supabase
    .from("medicines")
    .insert({ ...input, org_id: orgId })
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/inventory");
  return data;
}

export type CreateBatchInput = {
  medicine_id: string;
  batch_no: string;
  mfg_date?: string;
  expiry_date: string;
  mrp?: number;
  purchase_rate: number;
  sale_rate: number;
  qty_in_stock: number;
  supplier_id?: string;
};

export async function createBatch(input: CreateBatchInput) {
  const { supabase, orgId } = await requireOrgId();

  const { data, error } = await supabase
    .from("medicine_batches")
    .insert({ ...input, org_id: orgId })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("stock_movements").insert({
    org_id: orgId,
    batch_id: data.id,
    change_qty: input.qty_in_stock,
    reason: "purchase",
  });

  revalidatePath("/inventory");
  return data;
}

export type BulkImportRow = {
  name: string;
  generic_name?: string;
  manufacturer?: string;
  hsn_code?: string;
  batch_no: string;
  mfg_date?: string;
  expiry_date: string;
  mrp?: number;
  purchase_rate: number;
  sale_rate: number;
  qty: number;
  unit?: string;
  pack_size?: string;
  supplier_name?: string;
};

export async function bulkImportRows(rows: BulkImportRow[]) {
  const { supabase, orgId } = await requireOrgId();

  const { data: existing } = await supabase
    .from("medicines")
    .select("id, name, generic_name")
    .eq("org_id", orgId);

  const medicineKey = (name: string, generic?: string | null) =>
    `${name.trim().toLowerCase()}|${(generic ?? "").trim().toLowerCase()}`;

  const existingMap = new Map((existing ?? []).map((m) => [medicineKey(m.name, m.generic_name), m.id]));

  const supplierCache = new Map<string, string>();
  let created = 0;
  let matched = 0;
  let batchesCreated = 0;

  for (const row of rows) {
    const key = medicineKey(row.name, row.generic_name);
    let medicineId = existingMap.get(key);

    if (!medicineId) {
      const { data: newMed, error } = await supabase
        .from("medicines")
        .insert({
          org_id: orgId,
          name: row.name,
          generic_name: row.generic_name,
          manufacturer: row.manufacturer,
          hsn_code: row.hsn_code,
          unit: row.unit,
          pack_size: row.pack_size,
          default_purchase_rate: row.purchase_rate,
          default_sale_rate: row.sale_rate,
        })
        .select("id")
        .single();
      if (error) throw error;
      medicineId = newMed.id;
      existingMap.set(key, medicineId);
      created++;
    } else {
      matched++;
    }

    let supplierId: string | undefined;
    if (row.supplier_name) {
      const cached = supplierCache.get(row.supplier_name.toLowerCase());
      if (cached) {
        supplierId = cached;
      } else {
        const { data: existingSupplier } = await supabase
          .from("suppliers")
          .select("id")
          .eq("org_id", orgId)
          .ilike("name", row.supplier_name)
          .maybeSingle();
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const { data: newSupplier, error: supplierError } = await supabase
            .from("suppliers")
            .insert({ org_id: orgId, name: row.supplier_name })
            .select("id")
            .single();
          if (supplierError) throw supplierError;
          supplierId = newSupplier.id;
        }
        supplierCache.set(row.supplier_name.toLowerCase(), supplierId);
      }
    }

    const { data: batch, error: batchError } = await supabase
      .from("medicine_batches")
      .insert({
        org_id: orgId,
        medicine_id: medicineId,
        batch_no: row.batch_no,
        mfg_date: row.mfg_date,
        expiry_date: row.expiry_date,
        mrp: row.mrp,
        purchase_rate: row.purchase_rate,
        sale_rate: row.sale_rate,
        qty_in_stock: row.qty,
        supplier_id: supplierId,
      })
      .select("id")
      .single();
    if (batchError) throw batchError;

    await supabase.from("stock_movements").insert({
      org_id: orgId,
      batch_id: batch.id,
      change_qty: row.qty,
      reason: "purchase",
    });
    batchesCreated++;
  }

  revalidatePath("/inventory");
  return { created, matched, batchesCreated };
}
