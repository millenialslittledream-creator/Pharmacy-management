"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MedicineCombobox, type MedicineOption } from "@/components/inventory/medicine-combobox";
import { addQuickPick, removeQuickPick } from "@/lib/actions/quick-picks";

export type QuickPick = {
  id: string;
  position: number;
  medicines: { id: string; name: string; default_sale_rate: number | null; unit: string | null } | null;
};

const MAX_QUICK_PICKS = 7;

export function QuickAddPanel({
  initialPicks,
  canEdit,
  onQuickAdd,
}: {
  initialPicks: QuickPick[];
  canEdit: boolean;
  onQuickAdd: (medicine: { id: string; name: string }) => void;
}) {
  const [picks, setPicks] = useState(initialPicks);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<MedicineOption | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!draft) return;
    if (picks.length >= MAX_QUICK_PICKS) {
      toast.error(`You can only have ${MAX_QUICK_PICKS} quick-add medicines`);
      return;
    }
    startTransition(async () => {
      try {
        await addQuickPick(draft.id);
        setPicks((p) => [
          ...p,
          {
            id: draft.id,
            position: p.length + 1,
            medicines: {
              id: draft.id,
              name: draft.name,
              default_sale_rate: draft.default_sale_rate,
              unit: draft.unit,
            },
          },
        ]);
        setDraft(null);
        toast.success(`${draft.name} added to quick-add`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await removeQuickPick(id);
        setPicks((p) => p.filter((pick) => pick.id !== id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  if (picks.length === 0 && !canEdit) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
          Quick add
        </p>
        {canEdit && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Pencil className="size-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit quick-add medicines</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  {picks.map((pick) => (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>{pick.medicines?.name ?? "—"}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(pick.id)}
                        disabled={isPending}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {picks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No quick-add medicines yet.</p>
                  )}
                </div>
                {picks.length < MAX_QUICK_PICKS && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <MedicineCombobox value={draft} onSelect={setDraft} />
                    </div>
                    <Button type="button" size="icon" onClick={handleAdd} disabled={!draft || isPending}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {picks.map((pick) => {
          const medicine = pick.medicines;
          if (!medicine) return null;
          return (
            <Button
              key={pick.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickAdd(medicine)}
              className="rounded-full"
            >
              {medicine.name}
              {medicine.default_sale_rate != null && (
                <span className="text-muted-foreground">· {medicine.default_sale_rate.toFixed(0)}</span>
              )}
            </Button>
          );
        })}
        {picks.length === 0 && canEdit && (
          <p className="text-sm text-muted-foreground">
            No quick-add medicines yet — click the pencil to add up to 7.
          </p>
        )}
      </div>
    </div>
  );
}
