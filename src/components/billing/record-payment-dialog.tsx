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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recordPayment } from "@/lib/actions/billing";

type Method = "cash" | "card" | "upi";

export function RecordPaymentDialog({
  invoiceId,
  pendingAmount,
}: {
  invoiceId: string;
  pendingAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(pendingAmount.toFixed(2));
  const [method, setMethod] = useState<Method>("cash");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (value > pendingAmount) {
      toast.error(`Amount can't exceed the pending ₹${pendingAmount.toFixed(2)}`);
      return;
    }
    startTransition(async () => {
      try {
        await recordPayment(invoiceId, value, method);
        toast.success(`₹${value.toFixed(2)} recorded`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record payment");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAmount(pendingAmount.toFixed(2));
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pending on this invoice: ₹{pendingAmount.toFixed(2)}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Amount received</Label>
            <Input
              id="payment-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Paid by</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
