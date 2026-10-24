"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddBatchDialog } from "@/components/inventory/add-batch-dialog";
import { EditMedicineDialog } from "@/components/inventory/edit-medicine-dialog";
import { ColumnCustomizer } from "@/components/ui/column-customizer";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { deleteMedicines } from "@/lib/actions/inventory";
import { useColumnPrefs } from "@/lib/use-column-prefs";
import type { TemplateField } from "@/lib/stock-template";
import { formatMonthYear } from "@/lib/dates";
import type { Tables } from "@/lib/supabase/types";
import { errorMessage } from "@/lib/action-result";

export type StockRow = Tables<"medicine_stock_summary">;

const PAGE_SIZE = 25;

function expiryBadge(nearestExpiry: string | null) {
  if (!nearestExpiry) return null;
  const days = Math.ceil(
    (new Date(nearestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return <Badge variant="destructive">Expired</Badge>;
  if (days <= 30) return <Badge variant="destructive">Expires in {days}d</Badge>;
  if (days <= 60) return <Badge className="bg-orange-500 text-white">Expires in {days}d</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-500 text-white">Expires in {days}d</Badge>;
  return null;
}

type ColumnDef = {
  id: string;
  label: string;
  align?: "right";
  ceoOnly?: boolean;
  cell: (row: StockRow, rowNumber: number) => ReactNode;
};

const money = (v: number | null | undefined) => (v != null ? v.toFixed(2) : "—");
const text = (v: string | null | undefined) => v || "—";

function marginPct(row: StockRow) {
  const cost = row.avg_purchase_rate;
  const retail = row.default_sale_rate;
  return cost != null && retail != null && retail > 0 ? ((retail - cost) / retail) * 100 : null;
}

// Every column the table can show. Cost and margin are only offered to (and
// only ever sent to) the CEO.
const COLUMNS: ColumnDef[] = [
  { id: "sno", label: "S.No", cell: (_row, n) => n },
  { id: "name", label: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
  { id: "generic", label: "Generic name", cell: (r) => text(r.generic_name) },
  { id: "manufacturer", label: "Manufacturer", cell: (r) => text(r.manufacturer) },
  { id: "category", label: "Category / Drug type", cell: (r) => text(r.category) },
  { id: "schedule", label: "Schedule", cell: (r) => text(r.schedule_category) },
  { id: "pack", label: "Pack size", cell: (r) => text(r.pack_size) },
  { id: "hsn", label: "HSN code", cell: (r) => text(r.hsn_code) },
  { id: "tax", label: "GST %", align: "right", cell: (r) => (r.tax_rate != null ? `${r.tax_rate}%` : "—") },
  { id: "barcode", label: "Barcode", cell: (r) => text(r.barcode) },
  { id: "batchno", label: "Batch No", cell: (r) => text(r.batch_numbers) },
  {
    id: "stock",
    label: "Stock",
    align: "right",
    cell: (r) => {
      const low = r.reorder_level != null && (r.total_qty ?? 0) < r.reorder_level;
      return (
        <>
          {r.total_qty ?? 0} {r.unit ?? ""}
          {low && (
            <Badge variant="destructive" className="ml-2">
              Low stock
            </Badge>
          )}
        </>
      );
    },
  },
  { id: "batches", label: "Batches", align: "right", cell: (r) => r.batch_count ?? 0 },
  {
    id: "expiry",
    label: "Nearest expiry",
    cell: (r) => (
      <>
        {formatMonthYear(r.nearest_expiry)} {expiryBadge(r.nearest_expiry)}
      </>
    ),
  },
  { id: "reorder", label: "Reorder level", align: "right", cell: (r) => r.reorder_level ?? 0 },
  { id: "cost", label: "Cost", align: "right", ceoOnly: true, cell: (r) => money(r.avg_purchase_rate) },
  { id: "retail", label: "Retail", align: "right", cell: (r) => money(r.default_sale_rate) },
  {
    id: "margin",
    label: "Margin",
    align: "right",
    ceoOnly: true,
    cell: (r) => {
      const m = marginPct(r);
      return m != null ? `${m.toFixed(0)}%` : "—";
    },
  },
];

const DEFAULT_COLUMNS = [
  "sno",
  "name",
  "generic",
  "manufacturer",
  "batchno",
  "stock",
  "expiry",
  "reorder",
  "cost",
  "retail",
  "margin",
];

export function InventoryTable({
  rows,
  isCeo,
  userId,
  customFields,
}: {
  rows: StockRow[];
  isCeo: boolean;
  userId: string;
  customFields: TemplateField[];
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // CEO-defined template fields show up as extra optional columns.
  const available = useMemo(() => {
    const custom: ColumnDef[] = customFields.map((field) => ({
      id: `custom:${field.key}`,
      label: field.label,
      align: field.type === "number" ? "right" : undefined,
      cell: (row) => {
        const value = (row.custom_fields as Record<string, unknown> | null)?.[field.key];
        return value == null || value === "" ? "—" : String(value);
      },
    }));
    return [...COLUMNS.filter((c) => isCeo || !c.ceoOnly), ...custom];
  }, [isCeo, customFields]);
  const { columns: visibleIds, save, reset } = useColumnPrefs(
    `inventory-columns:v1:${userId}`,
    DEFAULT_COLUMNS,
    available.map((c) => c.id),
  );
  const byId = new Map(available.map((c) => [c.id, c]));
  const visible = visibleIds.map((id) => byId.get(id)).filter((c): c is ColumnDef => Boolean(c));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(from, from + PAGE_SIZE);

  const pageIds = pageRows.map((r) => r.medicine_id!).filter(Boolean);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function handleDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const result = await deleteMedicines(ids);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const parts = [];
        if (result.deleted) parts.push(`${result.deleted} deleted`);
        if (result.archived) parts.push(`${result.archived} removed from stock (kept in past invoices)`);
        toast.success(parts.join(", ") || "Nothing to delete");
        setSelected(new Set());
        setConfirmOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "Delete failed"));
      }
    });
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No medicines found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCeo && selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </>
          )}
        </div>
        <ColumnCustomizer
          options={available.map((c) => ({ id: c.id, label: c.label }))}
          visible={visibleIds}
          onChange={save}
          onReset={reset}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {isCeo && (
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  className="size-4 accent-primary"
                  checked={allOnPageSelected}
                  onChange={togglePage}
                />
              </TableHead>
            )}
            {visible.map((c) => (
              <TableHead key={c.id} className={c.align === "right" ? "text-right" : undefined}>
                {c.label}
              </TableHead>
            ))}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row, index) => {
            const id = row.medicine_id!;
            return (
              <TableRow key={id} data-state={selected.has(id) ? "selected" : undefined}>
                {isCeo && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      className="size-4 accent-primary"
                      checked={selected.has(id)}
                      onChange={() => toggleOne(id)}
                    />
                  </TableCell>
                )}
                {visible.map((c) => (
                  <TableCell
                    key={c.id}
                    className={
                      c.align === "right" ? "text-right" : c.id === "name" ? undefined : "text-sm text-muted-foreground"
                    }
                  >
                    {c.cell(row, from + index + 1)}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {isCeo && <EditMedicineDialog medicineId={id} name={row.name ?? "medicine"} customFields={customFields} />}
                    <AddBatchDialog
                      preselected={{
                        id,
                        name: row.name!,
                        generic_name: row.generic_name,
                        manufacturer: row.manufacturer,
                        unit: row.unit,
                        default_sale_rate: null,
                        barcode: null,
                        schedule_category: null,
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <PaginationControls
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={rows.length}
        onPageChange={setPage}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} medicine{selected.size === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              Medicines that were never sold are deleted for good, along with their batches. Ones that
              already appear on invoices are taken off the shelf and hidden, but stay on those past
              invoices. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
