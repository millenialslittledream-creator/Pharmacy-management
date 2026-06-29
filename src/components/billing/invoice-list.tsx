"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { listInvoices, returnInvoice, type InvoiceFilters } from "@/lib/actions/billing";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { Database } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

type Invoice = {
  id: string;
  invoice_no: string;
  created_at: string;
  payment_mode: Database["public"]["Enums"]["payment_mode"];
  status: Database["public"]["Enums"]["invoice_status"];
  grand_total: number;
  discount_total: number;
  customers: { name: string } | null;
};

const ALL = "__all__";

export function InvoiceList() {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [customerName, setCustomerName] = useState("");
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function refetch(next: InvoiceFilters, nextPage = page) {
    startTransition(async () => {
      const result = await listInvoices(next, nextPage, PAGE_SIZE);
      setInvoices(result.data as unknown as Invoice[]);
      setCount(result.count);
    });
  }

  useEffect(() => {
    refetch(filters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = { ...filters, customerName: customerName || undefined };
      setFilters(next);
      setPage(1);
      refetch(next, 1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName]);

  function updateFilter(patch: Partial<InvoiceFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    setPage(1);
    refetch(next, 1);
  }

  function handleReturn(id: string) {
    startTransition(async () => {
      try {
        await returnInvoice(id);
        toast.success("Invoice returned and stock restored");
        refetch(filters, page);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Return failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1.5 block text-xs">From</Label>
          <Input
            type="date"
            onChange={(e) => updateFilter({ from: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">To</Label>
          <Input type="date" onChange={(e) => updateFilter({ to: e.target.value || undefined })} />
        </div>
        <div className="min-w-48">
          <Label className="mb-1.5 block text-xs">Customer</Label>
          <Input
            placeholder="Search customer..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs">Payment mode</Label>
          <Select
            onValueChange={(v) => updateFilter({ paymentMode: v === ALL ? undefined : (v as Database["public"]["Enums"]["payment_mode"]) })}
            defaultValue={ALL}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs">Status</Label>
          <Select
            onValueChange={(v) => updateFilter({ status: v === ALL ? undefined : (v as Database["public"]["Enums"]["invoice_status"]) })}
            defaultValue={ALL}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isPending && invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No invoices found.
              </TableCell>
            </TableRow>
          )}
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">{inv.invoice_no}</TableCell>
              <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
              <TableCell>{inv.customers?.name ?? "Walk-in"}</TableCell>
              <TableCell className="capitalize">{inv.payment_mode}</TableCell>
              <TableCell>
                <Badge variant={inv.status === "returned" ? "destructive" : "secondary"}>
                  {inv.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{inv.grand_total.toFixed(2)}</TableCell>
              <TableCell>
                {inv.status === "paid" && (
                  <Button variant="outline" size="sm" onClick={() => handleReturn(inv.id)}>
                    Return
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageSize={PAGE_SIZE} total={count} onPageChange={setPage} />
    </div>
  );
}
