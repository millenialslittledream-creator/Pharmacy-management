"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicineCombobox, type MedicineOption } from "@/components/inventory/medicine-combobox";
import { editInvoice, listAvailableBatches, type InvoiceLineInput } from "@/lib/actions/billing";

type Batch = { id: string; batch_no: string; expiry_date: string; sale_rate: number; qty_in_stock: number };

type EditLine = {
  medicineName: string;
  batchId: string;
  batchNo: string;
  qty: number;
  unitRate: number;
  discountPct: number;
};

export function EditInvoiceForm({
  invoiceId,
  isFree,
  initialDiscountTotal,
  initialItems,
}: {
  invoiceId: string;
  isFree: boolean;
  initialDiscountTotal: number;
  initialItems: EditLine[];
}) {
  const router = useRouter();
  const [stagedMedicine, setStagedMedicine] = useState<MedicineOption | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stagedBatchId, setStagedBatchId] = useState<string>("");
  const [stagedQty, setStagedQty] = useState("1");

  const [cart, setCart] = useState<EditLine[]>(initialItems);
  const [billDiscount, setBillDiscount] = useState(String(initialDiscountTotal));
  const [isPending, startTransition] = useTransition();

  async function handleMedicineSelect(medicine: MedicineOption) {
    setStagedMedicine(medicine);
    const available = await listAvailableBatches(medicine.id);
    setBatches(available);
    setStagedBatchId(available[0]?.id ?? "");
  }

  function addToCart() {
    const batch = batches.find((b) => b.id === stagedBatchId);
    if (!stagedMedicine || !batch) {
      toast.error("Select a medicine with available stock first");
      return;
    }
    const qty = Number(stagedQty);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (qty > batch.qty_in_stock) {
      toast.error(`Only ${batch.qty_in_stock} in stock for this batch`);
      return;
    }

    setCart((c) => [
      ...c,
      {
        medicineName: stagedMedicine.name,
        batchId: batch.id,
        batchNo: batch.batch_no,
        qty,
        unitRate: batch.sale_rate,
        discountPct: 0,
      },
    ]);
    setStagedMedicine(null);
    setBatches([]);
    setStagedBatchId("");
    setStagedQty("1");
  }

  function removeLine(index: number) {
    setCart((c) => c.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<EditLine>) {
    setCart((c) => c.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const subtotal = cart.reduce(
    (sum, line) => sum + line.qty * line.unitRate * (1 - line.discountPct / 100),
    0,
  );
  const discount = isFree ? 0 : Number(billDiscount) || 0;
  const grandTotal = isFree ? 0 : Math.max(0, subtotal - discount);

  function handleSave() {
    if (cart.length === 0) {
      toast.error("An invoice must have at least one item");
      return;
    }
    const items: InvoiceLineInput[] = cart.map((line) => ({
      medicine_batch_id: line.batchId,
      qty: line.qty,
      unit_rate: line.unitRate,
      discount_pct: line.discountPct,
    }));

    startTransition(async () => {
      try {
        await editInvoice(invoiceId, { items, discountTotal: discount });
        toast.success("Invoice updated");
        router.push(`/billing/${invoiceId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update invoice");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-64 flex-1">
            <Label className="mb-1.5 block">Add medicine</Label>
            <MedicineCombobox value={stagedMedicine} onSelect={handleMedicineSelect} />
          </div>
          <div className="w-48">
            <Label className="mb-1.5 block">Batch (FEFO first)</Label>
            <Select value={stagedBatchId} onValueChange={setStagedBatchId} disabled={batches.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue className="truncate" placeholder="No stock" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batch_no} · exp {b.expiry_date} · {b.qty_in_stock} left
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Label className="mb-1.5 block">Qty</Label>
            <Input type="number" value={stagedQty} onChange={(e) => setStagedQty(e.target.value)} />
          </div>
          <Button type="button" onClick={addToCart}>
            Add
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Disc %</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No items — add at least one before saving
                </TableCell>
              </TableRow>
            )}
            {cart.map((line, i) => (
              <TableRow key={i}>
                <TableCell>{line.medicineName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{line.batchNo}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    className="w-20 text-right"
                    value={line.qty}
                    onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                  />
                </TableCell>
                <TableCell className="text-right">{line.unitRate.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  {isFree ? (
                    "100"
                  ) : (
                    <Input
                      type="number"
                      className="w-16 text-right"
                      value={line.discountPct}
                      onChange={(e) => updateLine(i, { discountPct: Number(e.target.value) })}
                    />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(line.qty * line.unitRate * (1 - (isFree ? 100 : line.discountPct) / 100)).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isFree && (
          <div className="max-w-xs space-y-1.5">
            <Label>Bill discount (flat)</Label>
            <Input type="number" value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} />
          </div>
        )}

        <div className="max-w-xs space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Grand total</span>
            <span>{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
