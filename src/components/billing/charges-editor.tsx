"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ChargeRow = { name: string; amount: string };

// Rows left completely blank are ignored; a half-filled row is an error.
export function parseCharges(rows: ChargeRow[]) {
  const charges: { name: string; amount: number }[] = [];
  for (const row of rows) {
    const name = row.name.trim();
    const amount = Number(row.amount);
    if (!name && !row.amount.trim()) continue;
    if (!name) return { charges, error: "Give each extra charge a name" };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { charges, error: `Enter an amount above 0 for "${name}"` };
    }
    charges.push({ name, amount });
  }
  return { charges, error: null as string | null };
}

export function chargesSum(rows: ChargeRow[]) {
  return rows.reduce((sum, r) => sum + (Number(r.amount) > 0 ? Number(r.amount) : 0), 0);
}

// Billable lines that aren't stock items: consumables (cotton, syringes),
// delivery, service fees, etc.
export function ChargesEditor({
  rows,
  onChange,
}: {
  rows: ChargeRow[];
  onChange: (rows: ChargeRow[]) => void;
}) {
  function update(index: number, patch: Partial<ChargeRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between">
        <Label>Consumables / other charges</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onChange([...rows, { name: "", amount: "" }])}
        >
          <Plus className="size-3.5" />
          Add charge
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Bill things that aren&apos;t in stock — cotton, syringes, delivery, service fee.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                placeholder="e.g. Cotton, Syringe, Delivery"
                value={row.name}
                maxLength={100}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                placeholder="Amount"
                className="w-28 text-right"
                value={row.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove charge"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
