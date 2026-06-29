"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { CustomerCombobox, type CustomerOption } from "@/components/billing/customer-combobox";
import { QuickAddPanel, type QuickPick } from "@/components/billing/quick-add-panel";
import {
  createQuickCustomer,
  listAvailableBatches,
  submitInvoice,
  type InvoiceLineInput,
} from "@/lib/actions/billing";
import type { Database } from "@/lib/supabase/types";
import { X } from "lucide-react";

type PaymentMode = Database["public"]["Enums"]["payment_mode"];
type Batch = { id: string; batch_no: string; expiry_date: string; sale_rate: number; qty_in_stock: number };

type CartLine = {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number;
  qty: number;
  unitRate: number;
  discountPct: number;
};

export function PosForm({
  initialQuickPicks,
  canEditQuickPicks,
}: {
  initialQuickPicks: QuickPick[];
  canEditQuickPicks: boolean;
}) {
  const router = useRouter();
  const [stagedMedicine, setStagedMedicine] = useState<MedicineOption | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stagedBatchId, setStagedBatchId] = useState<string>("");
  const [stagedQty, setStagedQty] = useState("1");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [billDiscount, setBillDiscount] = useState("0");
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
        medicineId: stagedMedicine.id,
        medicineName: stagedMedicine.name,
        batchId: batch.id,
        batchNo: batch.batch_no,
        expiryDate: batch.expiry_date,
        availableQty: batch.qty_in_stock,
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

  async function handleQuickAdd(medicine: { id: string; name: string }) {
    const available = await listAvailableBatches(medicine.id);
    const batch = available[0];
    if (!batch) {
      toast.error(`No stock available for ${medicine.name}`);
      return;
    }
    setCart((c) => [
      ...c,
      {
        medicineId: medicine.id,
        medicineName: medicine.name,
        batchId: batch.id,
        batchNo: batch.batch_no,
        expiryDate: batch.expiry_date,
        availableQty: batch.qty_in_stock,
        qty: 1,
        unitRate: batch.sale_rate,
        discountPct: 0,
      },
    ]);
    toast.success(`${medicine.name} added`);
  }

  function removeLine(index: number) {
    setCart((c) => c.filter((_, i) => i !== index));
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    setCart((c) => c.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const subtotal = cart.reduce(
    (sum, line) => sum + line.qty * line.unitRate * (1 - line.discountPct / 100),
    0,
  );
  const discount = Number(billDiscount) || 0;
  const grandTotal = Math.max(0, subtotal - discount);

  function handleSubmit() {
    if (cart.length === 0) {
      toast.error("Add at least one item to the bill");
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
        let customerId = customer?.id;
        if (!customerId && leadName.trim()) {
          const lead = await createQuickCustomer(leadName.trim(), leadPhone.trim() || undefined);
          customerId = lead.id;
        }

        const invoiceId = await submitInvoice({
          customerId,
          paymentMode,
          discountTotal: discount,
          items,
        });
        toast.success("Invoice created");
        router.push(`/billing/${invoiceId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>New bill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuickAddPanel
            initialPicks={initialQuickPicks}
            canEdit={canEditQuickPicks}
            onQuickAdd={handleQuickAdd}
          />
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Label className="mb-1.5 block">Medicine</Label>
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
                    No items yet
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
                      max={line.availableQty}
                      onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right">{line.unitRate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-16 text-right"
                      value={line.discountPct}
                      onChange={(e) => updateLine(i, { discountPct: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {(line.qty * line.unitRate * (1 - line.discountPct / 100)).toFixed(2)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <CustomerCombobox value={customer} onSelect={setCustomer} />
          </div>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2 text-sm">
              <span>
                {customer.name}
                {customer.phone ? ` · ${customer.phone}` : ""}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">
                New customer? Capture their details for follow-ups and loyalty tracking.
              </p>
              <Input
                placeholder="Customer name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
              <Input
                placeholder="Phone number"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bill discount (flat)</Label>
            <Input type="number" value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} />
          </div>
          <div className="space-y-1 border-t pt-3 text-sm">
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
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Complete sale"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
