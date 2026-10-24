"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bulkImportRows, type BulkImportRow } from "@/lib/actions/inventory";
import { isRequiredKey, type TemplateField } from "@/lib/stock-template";
import { MonthYearInput } from "@/components/ui/month-year-input";

const SCHEDULES = ["", "H", "H1", "X", "Others"];
const MONTH_YEAR_KEYS = new Set(["expiry_date", "mfg_date"]);
const NUMERIC_KEYS = new Set(["mrp", "purchase_rate", "sale_rate", "qty", "tax_rate", "reorder_level"]);

// One-by-one stock entry. The fields (and their order) come from the
// CEO-managed stock template, the same one the CSV template uses.
export function AddStockDialog({ fields }: { fields: TemplateField[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    const missing = fields.find((f) => isRequiredKey(f.key) && !values[f.key]?.trim());
    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }

    const row: Record<string, unknown> = {};
    const custom: Record<string, string | number> = {};
    for (const field of fields) {
      const raw = values[field.key]?.trim();
      if (!raw) continue;
      const value = field.type === "number" || NUMERIC_KEYS.has(field.key) ? Number(raw) : raw;
      if (typeof value === "number" && !Number.isFinite(value)) {
        toast.error(`${field.label} must be a number`);
        return;
      }
      if (field.custom) custom[field.key] = value;
      else row[field.key] = value;
    }

    startTransition(async () => {
      try {
        const result = await bulkImportRows([{ ...row, custom } as BulkImportRow]);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(`${values.name?.trim() ?? "Medicine"} added to stock`);
        setValues({});
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add stock");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Medicine</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add medicine with opening stock</DialogTitle>
          <DialogDescription>
            If the medicine already exists, this adds a new batch to it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`stock-${field.key}`}>
                {field.label}
                {MONTH_YEAR_KEYS.has(field.key) && " (MM-YYYY)"}
                {isRequiredKey(field.key) && " *"}
              </Label>
              {field.key === "schedule_category" ? (
                <select
                  id={`stock-${field.key}`}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={values[field.key] ?? ""}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  {SCHEDULES.map((s) => (
                    <option key={s} value={s}>
                      {s ? (s === "Others" ? "Others" : `Schedule ${s}`) : "Not scheduled"}
                    </option>
                  ))}
                </select>
              ) : MONTH_YEAR_KEYS.has(field.key) ? (
                <MonthYearInput
                  id={`stock-${field.key}`}
                  value={values[field.key] ?? ""}
                  onChange={(v) => set(field.key, v)}
                />
              ) : (
                <Input
                  id={`stock-${field.key}`}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  step={field.type === "number" ? "any" : undefined}
                  value={values[field.key] ?? ""}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
