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
    .select("id, name, generic_name, manufacturer, unit, default_sale_rate, barcode, schedule_category")
    .eq("org_id", orgId)
    .is("archived_at", null)
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
    .select("id, name, generic_name, manufacturer, unit, default_sale_rate, barcode, schedule_category")
    .eq("org_id", orgId)
    .is("archived_at", null)
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
  tax_rate?: number;
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

// ---- CEO-only stock editing --------------------------------------------
// Each of these is also enforced in the database (RLS / role checks inside the
// functions); the check here just gives a clear message instead of a raw error.

async function requireCeo() {
  const ctx = await requireOrgId();
  if (ctx.role !== "ceo") throw new Error("Only the CEO can edit or delete stock");
  return ctx;
}

export type EditableMedicine = {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string | null;
  unit: string | null;
  pack_size: string | null;
  hsn_code: string | null;
  tax_rate: number | null;
  reorder_level: number;
  default_purchase_rate: number | null;
  default_sale_rate: number | null;
  schedule_category: string | null;
  barcode: string | null;
};

export type EditableBatch = {
  id: string;
  batch_no: string;
  mfg_date: string | null;
  expiry_date: string;
  mrp: number | null;
  purchase_rate: number;
  sale_rate: number;
  qty_in_stock: number;
};

export async function getMedicineForEdit(id: string) {
  const { supabase } = await requireCeo();
  const { data, error } = await supabase.rpc("get_medicine_for_edit", { p_id: id });
  if (error) throw new Error(error.message);
  return data as unknown as { medicine: EditableMedicine; batches: EditableBatch[] };
}

export type UpdateMedicineInput = Omit<EditableMedicine, "id">;

export async function updateMedicine(id: string, input: UpdateMedicineInput) {
  const { supabase } = await requireCeo();
  const name = input.name?.trim();
  if (!name) throw new Error("Name is required");
  if ((input.reorder_level ?? 0) < 0) throw new Error("Reorder level cannot be negative");

  const { error } = await supabase
    .from("medicines")
    .update({
      name,
      generic_name: input.generic_name || null,
      manufacturer: input.manufacturer || null,
      category: input.category || null,
      unit: input.unit || null,
      pack_size: input.pack_size || null,
      hsn_code: input.hsn_code || null,
      tax_rate: input.tax_rate,
      reorder_level: input.reorder_level ?? 0,
      default_purchase_rate: input.default_purchase_rate,
      default_sale_rate: input.default_sale_rate,
      schedule_category: input.schedule_category || null,
      barcode: input.barcode || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

export async function updateBatch(id: string, input: Omit<EditableBatch, "id">) {
  const { supabase } = await requireCeo();
  const { error } = await supabase.rpc("update_batch", {
    p_batch_id: id,
    p_batch_no: input.batch_no,
    p_mfg_date: input.mfg_date ?? (null as unknown as string),
    p_expiry_date: input.expiry_date,
    p_mrp: input.mrp ?? (null as unknown as number),
    p_purchase_rate: input.purchase_rate,
    p_sale_rate: input.sale_rate,
    p_qty: input.qty_in_stock,
    p_supplier_id: null as unknown as string,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

export async function deleteMedicines(ids: string[]) {
  const { supabase } = await requireCeo();
  const { data, error } = await supabase.rpc("delete_medicines", { p_ids: ids });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return data as unknown as { deleted: number; archived: number };
}

export async function deleteBatches(ids: string[]) {
  const { supabase } = await requireCeo();
  const { data, error } = await supabase.rpc("delete_batches", { p_ids: ids });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  return data as unknown as { deleted: number; zeroed: number };
}
