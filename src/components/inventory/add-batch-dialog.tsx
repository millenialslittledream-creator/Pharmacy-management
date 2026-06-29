"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MedicineCombobox, type MedicineOption } from "@/components/inventory/medicine-combobox";
import { BarcodeScannerDialog } from "@/components/inventory/barcode-scanner";
import { createBatch, findMedicineByBarcode } from "@/lib/actions/inventory";
import { ScanLine } from "lucide-react";

const EMPTY = {
  batch_no: "",
  mfg_date: "",
  expiry_date: "",
  mrp: "",
  purchase_rate: "",
  sale_rate: "",
  qty_in_stock: "",
};

export function AddBatchDialog({ preselected }: { preselected?: MedicineOption }) {
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [medicine, setMedicine] = useState<MedicineOption | null>(preselected ?? null);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleScan(code: string) {
    const found = await findMedicineByBarcode(code);
    if (found) {
      setMedicine(found);
      toast.success(`Matched "${found.name}"`);
    } else {
      toast.error("No medicine matches that barcode — add it to the catalog first.");
    }
  }

  function handleSubmit() {
    if (!medicine) {
      toast.error("Select a medicine first");
      return;
    }
    if (!form.batch_no || !form.expiry_date || !form.purchase_rate || !form.sale_rate || !form.qty_in_stock) {
      toast.error("Batch no, expiry date, rates, and quantity are required");
      return;
    }
    startTransition(async () => {
      try {
        await createBatch({
          medicine_id: medicine.id,
          batch_no: form.batch_no,
          mfg_date: form.mfg_date || undefined,
          expiry_date: form.expiry_date,
          mrp: form.mrp ? Number(form.mrp) : undefined,
          purchase_rate: Number(form.purchase_rate),
          sale_rate: Number(form.sale_rate),
          qty_in_stock: Number(form.qty_in_stock),
        });
        toast.success("Batch added to stock");
        setForm(EMPTY);
        setMedicine(null);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add batch");
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Add Batch / Stock</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add batch / receive stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Medicine *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <MedicineCombobox value={medicine} onSelect={setMedicine} />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batch_no">Batch no *</Label>
                <Input id="batch_no" value={form.batch_no} onChange={(e) => set("batch_no", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qty_in_stock">Quantity *</Label>
                <Input id="qty_in_stock" type="number" value={form.qty_in_stock} onChange={(e) => set("qty_in_stock", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfg_date">Mfg date</Label>
                <Input id="mfg_date" type="date" value={form.mfg_date} onChange={(e) => set("mfg_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiry_date">Expiry date *</Label>
                <Input id="expiry_date" type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mrp">MRP</Label>
                <Input id="mrp" type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchase_rate">Purchase rate *</Label>
                <Input id="purchase_rate" type="number" value={form.purchase_rate} onChange={(e) => set("purchase_rate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale_rate">Sale rate *</Label>
                <Input id="sale_rate" type="number" value={form.sale_rate} onChange={(e) => set("sale_rate", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Save batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </>
  );
}
