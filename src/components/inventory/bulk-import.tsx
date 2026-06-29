"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkImportRows, type BulkImportRow } from "@/lib/actions/inventory";

const HEADER_ALIASES: Record<string, keyof BulkImportRow> = {
  "item name": "name",
  "name": "name",
  "generic name": "generic_name",
  "manufacturer": "manufacturer",
  "hsn code": "hsn_code",
  "batch no": "batch_no",
  "batch number": "batch_no",
  "mfg date": "mfg_date",
  "expiry date": "expiry_date",
  "mrp": "mrp",
  "purchase rate": "purchase_rate",
  "sale rate": "sale_rate",
  "qty": "qty",
  "quantity": "qty",
  "unit": "unit",
  "pack size": "pack_size",
  "supplier name": "supplier_name",
};

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

function normalizeRow(raw: Record<string, unknown>): BulkImportRow | null {
  const row: Partial<BulkImportRow> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_ALIASES[key.trim().toLowerCase()];
    if (!field || value === undefined || value === "") continue;
    if (field === "mrp" || field === "purchase_rate" || field === "sale_rate" || field === "qty") {
      (row as Record<string, unknown>)[field] = Number(value);
    } else if (field === "mfg_date" || field === "expiry_date") {
      (row as Record<string, unknown>)[field] = toIsoDate(value);
    } else {
      (row as Record<string, unknown>)[field] = String(value).trim();
    }
  }
  if (!row.name || !row.batch_no || !row.expiry_date || row.purchase_rate == null || row.sale_rate == null || row.qty == null) {
    return null;
  }
  return row as BulkImportRow;
}

export function BulkImport() {
  const router = useRouter();
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "binary", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const parsed: BulkImportRow[] = [];
      let invalid = 0;
      for (const r of raw) {
        const normalized = normalizeRow(r);
        if (normalized) parsed.push(normalized);
        else invalid++;
      }
      setRows(parsed);
      setInvalidCount(invalid);
    };
    reader.readAsBinaryString(file);
  }

  function handleImport() {
    if (rows.length === 0) return;
    startTransition(async () => {
      try {
        const result = await bulkImportRows(rows);
        toast.success(
          `Imported ${result.batchesCreated} batches — ${result.created} new medicines, ${result.matched} matched existing.`,
        );
        setRows([]);
        router.push("/inventory");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Expected columns: Item Name, Generic Name, Manufacturer, HSN Code, Batch No, Mfg Date,
          Expiry Date, MRP, Purchase Rate, Sale Rate, Qty, Unit, Pack Size, Supplier Name. Dates as
          YYYY-MM-DD.
        </p>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-sm">
            {rows.length} valid row(s) ready to import
            {invalidCount > 0 && `, ${invalidCount} row(s) skipped (missing required fields)`}.
          </p>
          <div className="max-h-96 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Sale rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.batch_no}</TableCell>
                    <TableCell>{row.expiry_date}</TableCell>
                    <TableCell className="text-right">{row.qty}</TableCell>
                    <TableCell className="text-right">{row.sale_rate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleImport} disabled={isPending}>
            {isPending ? "Importing..." : `Import ${rows.length} row(s)`}
          </Button>
        </>
      )}
    </div>
  );
}
