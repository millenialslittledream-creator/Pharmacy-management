"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { presetToRange, type DateRangePreset } from "@/lib/date-ranges";
import { getScheduledDrugRegister } from "@/lib/actions/compliance";
import { cn } from "@/lib/utils";

type RegisterRow = {
  invoice_item_id: string | null;
  created_at: string | null;
  invoice_no: string | null;
  customer_name: string | null;
  medicine_name: string | null;
  schedule_category: string | null;
  batch_no: string | null;
  qty: number | null;
  prescribing_doctor: string | null;
  prescription_ref: string | null;
};

export function ComplianceRegister({ initialRows }: { initialRows: RegisterRow[] }) {
  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<RegisterRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { from, to } = presetToRange(preset, customFrom, customTo);
    startTransition(async () => {
      setRows(await getScheduledDrugRegister(from, to));
    });
  }, [preset, customFrom, customTo]);

  function exportCsv() {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        Date: r.created_at ? new Date(r.created_at).toLocaleString() : "",
        Invoice: r.invoice_no,
        Customer: r.customer_name ?? "Walk-in",
        Medicine: r.medicine_name,
        Schedule: r.schedule_category,
        Batch: r.batch_no,
        Qty: r.qty,
        Doctor: r.prescribing_doctor ?? "",
        "Prescription Ref": r.prescription_ref ?? "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Register");
    XLSX.writeFile(workbook, `scheduled-drug-register-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <Card className={cn("transition-opacity duration-300 ease-premium", isPending && "opacity-60")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scheduled drug register</CardTitle>
        <div className="flex items-center gap-2">
          <DateRangePicker
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setPreset}
            onCustomChange={(f, t) => {
              setCustomFrom(f);
              setCustomTo(t);
            }}
          />
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Prescription ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No scheduled drug sales in this range.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.invoice_item_id}>
                <TableCell className="text-sm">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-sm">{r.invoice_no}</TableCell>
                <TableCell className="text-sm">{r.customer_name ?? "Walk-in"}</TableCell>
                <TableCell className="text-sm">{r.medicine_name}</TableCell>
                <TableCell className="text-sm">{r.schedule_category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.batch_no}</TableCell>
                <TableCell className="text-right text-sm">{r.qty}</TableCell>
                <TableCell className="text-sm">{r.prescribing_doctor ?? "—"}</TableCell>
                <TableCell className="text-sm">{r.prescription_ref ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
