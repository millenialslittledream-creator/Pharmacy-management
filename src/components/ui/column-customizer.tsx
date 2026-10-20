"use client";

import { ArrowDown, ArrowUp, Columns3, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ColumnOption = { id: string; label: string };

type Props = {
  options: ColumnOption[];
  visible: string[];
  onChange: (next: string[]) => void;
  onReset: () => void;
};

// Lets the user hide/show table columns and change their order.
export function ColumnCustomizer({ options, visible, onChange, onReset }: Props) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const shown = visible.map((id) => byId.get(id)).filter((o): o is ColumnOption => Boolean(o));
  const hidden = options.filter((o) => !visible.includes(o.id));

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= visible.length) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="size-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-medium">Table columns</p>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onReset}>
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>

        <ul className="space-y-1">
          {shown.map((col, index) => (
            <li key={col.id} className="flex items-center gap-1 rounded-md border px-2 py-1">
              <span className="flex-1 truncate text-sm">{col.label}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move ${col.label} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move ${col.label} down`}
                disabled={index === shown.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Hide ${col.label}`}
                disabled={shown.length === 1}
                onClick={() => onChange(visible.filter((id) => id !== col.id))}
              >
                <EyeOff className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>

        {hidden.length > 0 && (
          <>
            <p className="pt-1 text-xs font-medium text-muted-foreground">Add a column</p>
            <ul className="space-y-1">
              {hidden.map((col) => (
                <li key={col.id} className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1">
                  <span className="flex-1 truncate text-sm text-muted-foreground">{col.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Show ${col.label}`}
                    onClick={() => onChange([...visible, col.id])}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
