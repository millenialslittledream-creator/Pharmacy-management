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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCustomer } from "@/lib/actions/customers";

const EMPTY = { name: "", phone: "", address: "", age: "", gender: "" };

export function AddCustomerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      try {
        await createCustomer({
          name: form.name,
          phone: form.phone || undefined,
          address: form.address || undefined,
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender || undefined,
        });
        toast.success("Customer added");
        setForm(EMPTY);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add customer");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" value={form.age} onChange={(e) => set("age", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
