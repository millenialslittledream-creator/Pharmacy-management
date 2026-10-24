"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { saveStockTemplate } from "@/lib/actions/inventory";
import {
  BUILTIN_FIELDS,
  DEFAULT_TEMPLATE,
  MAX_FIELDS,
  builtinField,
  isRequiredKey,
  newCustomKey,
  type FieldType,
  type TemplateField,
} from "@/lib/stock-template";
import { errorMessage } from "@/lib/action-result";

// CEO-only: choose which fields the stock entry form and the CSV template
// contain, and in what order. Saving updates both immediately.
export function StockTemplateDialog({ fields }: { fields: TemplateField[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TemplateField[]>(fields);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<FieldType>("text");
  const [isPending, startTransition] = useTransition();

  const usedKeys = draft.map((f) => f.key);
  const unusedBuiltins = Object.keys(BUILTIN_FIELDS).filter((key) => !usedKeys.includes(key));

  function handleOpenChange(next: boolean) {
    if (next) setDraft(fields);
    setOpen(next);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  }

  function addBuiltin(key: string) {
    if (draft.length >= MAX_FIELDS) return toast.error(`A template can have at most ${MAX_FIELDS} fields`);
    setDraft([...draft, builtinField(key)]);
  }

  function addCustom() {
    const label = customLabel.trim();
    if (!label) return toast.error("Give the new field a name");
    if (draft.length >= MAX_FIELDS) return toast.error(`A template can have at most ${MAX_FIELDS} fields`);
    if (draft.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      return toast.error("A field with that name already exists");
    }
    setDraft([
      ...draft,
      { key: newCustomKey(label, usedKeys), label: label.slice(0, 40), type: customType, custom: true },
    ]);
    setCustomLabel("");
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await saveStockTemplate(draft);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Template saved — the add form and CSV template now use it");
        setOpen(false);
      } catch (err) {
        toast.error(errorMessage(err, "Could not save the template"));
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" className="gap-2" onClick={() => handleOpenChange(true)}>
        <ListChecks className="size-4" />
        Customize template
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Stock template</DialogTitle>
            <DialogDescription>
              These fields — in this order — appear in the Add medicine form and as the columns of the
              downloadable CSV template. Fields marked required can&apos;t be removed.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5">
            {draft.map((field, index) => {
              const required = isRequiredKey(field.key);
              return (
                <li key={field.key} className="flex items-center gap-1 rounded-md border px-2 py-1.5">
                  <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
                  <span className="flex-1 truncate text-sm">
                    {field.label}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {field.custom ? `custom · ${field.type}` : field.type}
                      {required && " · required"}
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" aria-label={`Move ${field.label} down`} disabled={index === draft.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    aria-label={`Remove ${field.label}`}
                    disabled={required}
                    onClick={() => setDraft(draft.filter((f) => f.key !== field.key))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>

          {unusedBuiltins.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Add an available field</Label>
              <div className="flex flex-wrap gap-1.5">
                {unusedBuiltins.map((key) => (
                  <Button key={key} type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => addBuiltin(key)}>
                    <Plus className="size-3" />
                    {BUILTIN_FIELDS[key].label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 rounded-lg border border-dashed p-3">
            <Label className="text-xs text-muted-foreground">Create a new field</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Rack no, Composition, Brand"
                value={customLabel}
                maxLength={40}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
              <select
                aria-label="Field type"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={customType}
                onChange={(e) => setCustomType(e.target.value as FieldType)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
              <Button type="button" variant="outline" onClick={addCustom}>
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              New fields are saved per medicine and can be shown as a column in the inventory table.
              Removing a field hides it but keeps any data already entered.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" className="gap-1.5" onClick={() => setDraft(DEFAULT_TEMPLATE)}>
              <RotateCcw className="size-3.5" />
              Reset to default
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : "Save template"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
