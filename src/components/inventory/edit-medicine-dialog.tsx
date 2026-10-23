"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteBatches,
  getMedicineForEdit,
  updateBatch,
  updateMedicine,
  type EditableBatch,
  type EditableMedicine,
} from "@/lib/actions/inventory";
import type { TemplateField } from "@/lib/stock-template";

type MedicineForm = Record<keyof Omit<EditableMedicine, "id" | "custom_fields">, string>;
type BatchForm = Record<keyof Omit<EditableBatch, "id">, string> & { id: string };

const MEDICINE_FIELDS: { key: keyof MedicineForm; label: string; type?: string }[] = [
  { key: "name", label: "Name *" },
  { key: "generic_name", label: "Generic name" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "category", label: "Category" },
  { key: "schedule_category", label: "Schedule (H, H1, X, Others…)" },
  { key: "unit", label: "Unit" },
  { key: "pack_size", label: "Pack size" },
  { key: "hsn_code", label: "HSN code" },
  { key: "tax_rate", label: "GST %", type: "number" },
  { key: "reorder_level", label: "Reorder level", type: "number" },
  { key: "default_purchase_rate", label: "Default purchase rate", type: "number" },
  { key: "default_sale_rate", label: "Default sale rate", type: "number" },
  { key: "barcode", label: "Barcode" },
];

const BATCH_FIELDS: { key: keyof Omit<BatchForm, "id">; label: string; type?: string }[] = [
  { key: "batch_no", label: "Batch no" },
  { key: "qty_in_stock", label: "Qty", type: "number" },
  { key: "expiry_date", label: "Expiry", type: "date" },
  { key: "mfg_date", label: "Mfg", type: "date" },
  { key: "mrp", label: "MRP", type: "number" },
  { key: "purchase_rate", label: "Purchase", type: "number" },
  { key: "sale_rate", label: "Sale", type: "number" },
];

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

// CEO-only: edit a medicine's details and each of its stock batches.
export function EditMedicineDialog({
  medicineId,
  name,
  customFields,
}: {
  medicineId: string;
  name: string;
  customFields: TemplateField[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medicine, setMedicine] = useState<MedicineForm | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string | number | null>>({});
  const [batches, setBatches] = useState<BatchForm[]>([]);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const data = await getMedicineForEdit(medicineId);
      const { id: _id, custom_fields, ...m } = data.medicine;
      void _id;
      setCustomValues(custom_fields ?? {});
      setMedicine(
        Object.fromEntries(Object.entries(m).map(([k, v]) => [k, str(v as string | number | null)])) as MedicineForm,
      );
      setBatches(
        data.batches.map((b) => ({
          id: b.id,
          batch_no: str(b.batch_no),
          qty_in_stock: str(b.qty_in_stock),
          expiry_date: str(b.expiry_date),
          mfg_date: str(b.mfg_date),
          mrp: str(b.mrp),
          purchase_rate: str(b.purchase_rate),
          sale_rate: str(b.sale_rate),
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load this medicine");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  function saveMedicine() {
    if (!medicine) return;
    startTransition(async () => {
      try {
        await updateMedicine(medicineId, {
          name: medicine.name,
          generic_name: medicine.generic_name,
          manufacturer: medicine.manufacturer,
          category: medicine.category,
          unit: medicine.unit,
          pack_size: medicine.pack_size,
          hsn_code: medicine.hsn_code,
          tax_rate: num(medicine.tax_rate),
          reorder_level: Number(medicine.reorder_level || 0),
          default_purchase_rate: num(medicine.default_purchase_rate),
          default_sale_rate: num(medicine.default_sale_rate),
          schedule_category: medicine.schedule_category,
          barcode: medicine.barcode,
          custom_fields: customValues,
        });
        toast.success("Medicine updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function saveBatch(batch: BatchForm) {
    startTransition(async () => {
      try {
        await updateBatch(batch.id, {
          batch_no: batch.batch_no,
          mfg_date: batch.mfg_date || null,
          expiry_date: batch.expiry_date,
          mrp: num(batch.mrp),
          purchase_rate: Number(batch.purchase_rate),
          sale_rate: Number(batch.sale_rate),
          qty_in_stock: Number(batch.qty_in_stock),
        });
        toast.success(`Batch ${batch.batch_no} updated`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function removeBatch(batch: BatchForm) {
    if (!window.confirm(`Remove batch ${batch.batch_no}? Its remaining stock will be taken off the shelf.`)) return;
    startTransition(async () => {
      try {
        await deleteBatches([batch.id]);
        setBatches((list) => list.filter((b) => b.id !== batch.id));
        toast.success(`Batch ${batch.batch_no} removed`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  function setMedicineField(key: keyof MedicineForm, value: string) {
    setMedicine((m) => (m ? { ...m, [key]: value } : m));
  }

  function setBatchField(id: string, key: keyof Omit<BatchForm, "id">, value: string) {
    setBatches((list) => list.map((b) => (b.id === id ? { ...b, [key]: value } : b)));
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleOpenChange(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {name}</DialogTitle>
            <DialogDescription>
              Changes apply immediately to stock and future bills. Past invoices are not changed.
            </DialogDescription>
          </DialogHeader>

          {loading || !medicine ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {MEDICINE_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={`med-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`med-${f.key}`}
                        type={f.type ?? "text"}
                        value={medicine[f.key]}
                        onChange={(e) => setMedicineField(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                  {customFields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={`med-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`med-${f.key}`}
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={customValues[f.key] == null ? "" : String(customValues[f.key])}
                        onChange={(e) =>
                          setCustomValues((v) => ({
                            ...v,
                            [f.key]: f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={saveMedicine} disabled={isPending}>
                  {isPending ? "Saving…" : "Save medicine details"}
                </Button>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Stock batches ({batches.length})</h3>
                {batches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No batches. Use “Add Batch / Stock” to receive stock.</p>
                )}
                {batches.map((b) => (
                  <div key={b.id} className="space-y-2 rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {BATCH_FIELDS.map((f) => (
                        <div key={f.key} className="space-y-1">
                          <Label htmlFor={`${b.id}-${f.key}`} className="text-xs">
                            {f.label}
                          </Label>
                          <Input
                            id={`${b.id}-${f.key}`}
                            type={f.type ?? "text"}
                            value={b[f.key]}
                            onChange={(e) => setBatchField(b.id, f.key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" disabled={isPending} onClick={() => saveBatch(b)}>
                        Save batch
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={isPending}
                        onClick={() => removeBatch(b)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
