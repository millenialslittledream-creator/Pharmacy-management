"use server";

import { revalidatePath } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";
import { sanitizeSearchTerm } from "@/lib/search";
import { parseMonthYear } from "@/lib/dates";
import {
  resolveTemplate,
  type TemplateField,
} from "@/lib/stock-template";
import type { Json } from "@/lib/supabase/types";

// Production hides the text of thrown server-action errors, so actions the
// user acts on return their errors instead of throwing them.
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
}

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

export async function createBatch(input: CreateBatchInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, orgId } = await requireOrgId();

    const expiry = parseMonthYear(input.expiry_date, "expiry");
    if ("error" in expiry) return { ok: false, error: expiry.error };
    let mfgDate: string | null = null;
    if (input.mfg_date) {
      const mfg = parseMonthYear(input.mfg_date, "mfg");
      if ("error" in mfg) return { ok: false, error: mfg.error };
      mfgDate = mfg.date;
    }
    if (!input.batch_no?.trim()) return { ok: false, error: "Batch number is required" };
    for (const value of [input.qty_in_stock, input.purchase_rate, input.sale_rate, input.mrp ?? 0]) {
      if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Rates and quantity must be 0 or more" };
    }

    const { data, error } = await supabase
      .from("medicine_batches")
      .insert({
        org_id: orgId,
        medicine_id: input.medicine_id,
        batch_no: input.batch_no.trim(),
        mfg_date: mfgDate,
        expiry_date: expiry.date,
        mrp: input.mrp,
        purchase_rate: input.purchase_rate,
        sale_rate: input.sale_rate,
        qty_in_stock: input.qty_in_stock,
        supplier_id: input.supplier_id,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await supabase.from("stock_movements").insert({
      org_id: orgId,
      batch_id: data.id,
      change_qty: input.qty_in_stock,
      reason: "purchase",
    });

    revalidatePath("/inventory");
    return { ok: true, id: data.id };
  } catch (err) {
    return fail(err);
  }
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
  category?: string;
  schedule_category?: string;
  tax_rate?: number;
  reorder_level?: number;
  barcode?: string;
  custom?: Record<string, string | number>;
};

export async function getStockTemplate(): Promise<TemplateField[]> {
  const { supabase, orgId } = await requireOrgId();
  const { data } = await supabase
    .from("organizations")
    .select("stock_template")
    .eq("id", orgId)
    .single();
  return resolveTemplate(data?.stock_template);
}

// Only the CEO can reshape the template (also enforced by RLS on organizations).
export async function saveStockTemplate(fields: TemplateField[]): Promise<ActionResult<{ fields: TemplateField[] }>> {
  try {
    const { supabase, orgId, role } = await requireOrgId();
    if (role !== "ceo") return { ok: false, error: "Only the CEO can change the stock template" };

    const resolved = resolveTemplate(fields);
    const { error } = await supabase
      .from("organizations")
      .update({ stock_template: resolved as unknown as Json })
      .eq("id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inventory");
    revalidatePath("/inventory/import");
    return { ok: true, fields: resolved };
  } catch (err) {
    return fail(err);
  }
}

function checkImportRow(row: BulkImportRow, index: number) {
  const where = `Row ${index + 1}`;
  if (!row.name?.trim() || !row.batch_no?.trim()) throw new Error(`${where}: name and batch no are required`);
  // Accept the date styles people actually use (06-2027, 30-06-2027, Jun-27…)
  const expiry = parseMonthYear(row.expiry_date, "expiry");
  if ("error" in expiry) throw new Error(`${where}: ${expiry.error}`);
  row.expiry_date = expiry.date;
  if (row.mfg_date) {
    const mfg = parseMonthYear(row.mfg_date, "mfg");
    if ("error" in mfg) throw new Error(`${where}: ${mfg.error}`);
    row.mfg_date = mfg.date;
  }
  for (const [label, value] of [
    ["quantity", row.qty],
    ["purchase rate", row.purchase_rate],
    ["sale rate", row.sale_rate],
    ["MRP", row.mrp],
    ["reorder level", row.reorder_level],
  ] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${where}: ${label} must be a number, 0 or more`);
    }
  }
  if (row.tax_rate != null && (!Number.isFinite(row.tax_rate) || row.tax_rate < 0 || row.tax_rate > 100)) {
    throw new Error(`${where}: GST % must be between 0 and 100`);
  }
}

// Keep only values for custom fields that exist in the org's template.
function pickCustom(custom: BulkImportRow["custom"], template: TemplateField[]) {
  const out: Record<string, string | number> = {};
  for (const field of template) {
    if (!field.custom) continue;
    const value = custom?.[field.key];
    if (value === undefined || value === "") continue;
    out[field.key] = typeof value === "number" ? value : String(value).slice(0, 200);
  }
  return out;
}

export type BulkImportResult =
  | { ok: true; created: number; matched: number; batchesCreated: number }
  | { ok: false; error: string };

// Returns the error instead of throwing: in production Next hides thrown
// server-action messages, which left users with a meaningless generic error.
export async function bulkImportRows(rows: BulkImportRow[]): Promise<BulkImportResult> {
  try {
    return { ok: true, ...(await runBulkImport(rows)) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return { ok: false, error: message };
  }
}

async function runBulkImport(rows: BulkImportRow[]) {
  const { supabase, orgId } = await requireOrgId();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Nothing to import");
  if (rows.length > 2000) throw new Error("Import at most 2000 rows at a time");
  rows.forEach(checkImportRow);
  const template = await getStockTemplate();

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
          category: row.category || undefined,
          schedule_category: row.schedule_category || undefined,
          tax_rate: row.tax_rate,
          reorder_level: row.reorder_level,
          barcode: row.barcode || undefined,
          custom_fields: pickCustom(row.custom, template),
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
  custom_fields: Record<string, string | number | null>;
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

export async function getMedicineForEdit(
  id: string,
): Promise<ActionResult<{ medicine: EditableMedicine; batches: EditableBatch[] }>> {
  try {
    const { supabase } = await requireCeo();
    const { data, error } = await supabase.rpc("get_medicine_for_edit", { p_id: id });
    if (error) return { ok: false, error: error.message };
    const parsed = data as unknown as { medicine: EditableMedicine; batches: EditableBatch[] };
    return { ok: true, ...parsed };
  } catch (err) {
    return fail(err);
  }
}

export type UpdateMedicineInput = Omit<EditableMedicine, "id">;

function cleanCustomFields(raw: UpdateMedicineInput["custom_fields"]) {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (!/^custom_[a-z0-9_]{1,40}$/.test(key) || value == null || value === "") continue;
    out[key] = typeof value === "number" ? value : String(value).slice(0, 200);
  }
  return out as unknown as Json;
}

export async function updateMedicine(id: string, input: UpdateMedicineInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireCeo();
    const name = input.name?.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if ((input.reorder_level ?? 0) < 0) return { ok: false, error: "Reorder level cannot be negative" };

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
        custom_fields: cleanCustomFields(input.custom_fields),
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateBatch(id: string, input: Omit<EditableBatch, "id">): Promise<ActionResult> {
  try {
    const { supabase } = await requireCeo();

    const expiry = parseMonthYear(input.expiry_date, "expiry");
    if ("error" in expiry) return { ok: false, error: expiry.error };
    let mfgDate: string | null = null;
    if (input.mfg_date) {
      const mfg = parseMonthYear(input.mfg_date, "mfg");
      if ("error" in mfg) return { ok: false, error: mfg.error };
      mfgDate = mfg.date;
    }
    if (!input.batch_no?.trim()) return { ok: false, error: "Batch number is required" };
    for (const value of [input.qty_in_stock, input.purchase_rate, input.sale_rate, input.mrp ?? 0]) {
      if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Rates and quantity must be 0 or more" };
    }

    const { error } = await supabase.rpc("update_batch", {
      p_batch_id: id,
      p_batch_no: input.batch_no,
      p_mfg_date: mfgDate ?? (null as unknown as string),
      p_expiry_date: expiry.date,
      p_mrp: input.mrp ?? (null as unknown as number),
      p_purchase_rate: input.purchase_rate,
      p_sale_rate: input.sale_rate,
      p_qty: input.qty_in_stock,
      p_supplier_id: null as unknown as string,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inventory");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteMedicines(ids: string[]): Promise<ActionResult<{ deleted: number; archived: number }>> {
  try {
    const { supabase } = await requireCeo();
    const { data, error } = await supabase.rpc("delete_medicines", { p_ids: ids });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inventory");
    return { ok: true, ...(data as unknown as { deleted: number; archived: number }) };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBatches(ids: string[]): Promise<ActionResult<{ deleted: number; zeroed: number }>> {
  try {
    const { supabase } = await requireCeo();
    const { data, error } = await supabase.rpc("delete_batches", { p_ids: ids });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inventory");
    return { ok: true, ...(data as unknown as { deleted: number; zeroed: number }) };
  } catch (err) {
    return fail(err);
  }
}
