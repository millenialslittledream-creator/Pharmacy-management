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
import { BarcodeScannerDialog } from "@/components/inventory/barcode-scanner";
import { createMedicine, findMedicineByBarcode } from "@/lib/actions/inventory";
import { ScanLine } from "lucide-react";

const EMPTY = {
  name: "",
  generic_name: "",
  manufacturer: "",
  category: "",
  unit: "",
  pack_size: "",
  hsn_code: "",
  reorder_level: "",
  default_purchase_rate: "",
  default_sale_rate: "",
  barcode: "",
};

export function AddMedicineDialog() {
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleScan(code: string) {
    set("barcode", code);
    const existing = await findMedicineByBarcode(code);
    if (existing) {
      toast.error(`Barcode already matches "${existing.name}" — use Add Batch instead.`);
    } else {
      toast.success("Barcode captured — fill in the remaining details.");
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    startTransition(async () => {
      try {
        await createMedicine({
          name: form.name,
          generic_name: form.generic_name || undefined,
          manufacturer: form.manufacturer || undefined,
          category: form.category || undefined,
          unit: form.unit || undefined,
          pack_size: form.pack_size || undefined,
          hsn_code: form.hsn_code || undefined,
          reorder_level: form.reorder_level ? Number(form.reorder_level) : undefined,
          default_purchase_rate: form.default_purchase_rate ? Number(form.default_purchase_rate) : undefined,
          default_sale_rate: form.default_sale_rate ? Number(form.default_sale_rate) : undefined,
          barcode: form.barcode || undefined,
        });
        toast.success("Medicine added");
        setForm(EMPTY);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add medicine");
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Medicine</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add medicine to catalog</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="generic_name">Generic name</Label>
              <Input id="generic_name" value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Tablet, Syrup..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="strip, bottle..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pack_size">Pack size</Label>
              <Input id="pack_size" value={form.pack_size} onChange={(e) => set("pack_size", e.target.value)} placeholder="10x10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hsn_code">HSN code</Label>
              <Input id="hsn_code" value={form.hsn_code} onChange={(e) => set("hsn_code", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorder_level">Reorder level</Label>
              <Input id="reorder_level" type="number" value={form.reorder_level} onChange={(e) => set("reorder_level", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_purchase_rate">Default purchase rate</Label>
              <Input id="default_purchase_rate" type="number" value={form.default_purchase_rate} onChange={(e) => set("default_purchase_rate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_sale_rate">Default sale rate</Label>
              <Input id="default_sale_rate" type="number" value={form.default_sale_rate} onChange={(e) => set("default_sale_rate", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input id="barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
                <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Save medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </>
  );
}
