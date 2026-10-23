"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
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
import { REQUIRED_KEYS, matchHeader, sampleCsv, type TemplateField } from "@/lib/stock-template";

function downloadTemplate(fields: TemplateField[]) {
  const blob = new Blob([sampleCsv(fields)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "medicine-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

// Maps one spreadsheet row onto the template's fields (by header name).
function normalizeRow(raw: Record<string, unknown>, fields: TemplateField[]): BulkImportRow | null {
  const row: Record<string, unknown> = {};
  const custom: Record<string, string | number> = {};

  for (const [header, value] of Object.entries(raw)) {
    const field = matchHeader(header, fields);
    if (!field || value === undefined || value === "") continue;

    let parsed: string | number;
    if (field.type === "number") parsed = Number(String(value).replace(/,/g, ""));
    else if (field.type === "date") parsed = toIsoDate(value);
    else parsed = String(value).trim();

    if (field.custom) custom[field.key] = parsed;
    else row[field.key] = parsed;
  }

  for (const key of REQUIRED_KEYS) {
    const value = row[key];
    if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) return null;
  }
  return { ...row, custom } as unknown as BulkImportRow;
}

export function BulkImport({ fields }: { fields: TemplateField[] }) {
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
        const normalized = normalizeRow(r, fields);
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
          Expected columns: {fields.map((f) => f.label).join(", ")}. Dates as YYYY-MM-DD. Download
          the template below — it always matches the current stock template.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate(fields)} className="gap-2">
          <Download className="size-4" />
          Download CSV template
        </Button>
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
