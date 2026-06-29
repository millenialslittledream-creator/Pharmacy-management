"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddBatchDialog } from "@/components/inventory/add-batch-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { Tables } from "@/lib/supabase/types";

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

export function InventoryTable({ rows }: { rows: StockRow[] }) {
  const [page, setPage] = useState(1);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No medicines found.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(from, from + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Generic / Manufacturer</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Nearest expiry</TableHead>
            <TableHead className="text-right">Reorder level</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row) => {
            const lowStock = row.reorder_level != null && (row.total_qty ?? 0) < row.reorder_level;
            return (
              <TableRow key={row.medicine_id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[row.generic_name, row.manufacturer].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {row.total_qty ?? 0} {row.unit ?? ""}
                  {lowStock && (
                    <Badge variant="destructive" className="ml-2">
                      Low stock
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {row.nearest_expiry ?? "—"} {expiryBadge(row.nearest_expiry)}
                </TableCell>
                <TableCell className="text-right">{row.reorder_level ?? 0}</TableCell>
                <TableCell>
                  <AddBatchDialog
                    preselected={{
                      id: row.medicine_id!,
                      name: row.name!,
                      generic_name: row.generic_name,
                      manufacturer: row.manufacturer,
                      unit: row.unit,
                      default_sale_rate: null,
                      barcode: null,
                    }}
                  />
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
    </div>
  );
}
