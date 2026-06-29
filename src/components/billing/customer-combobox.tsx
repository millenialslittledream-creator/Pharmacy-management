"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchCustomers, createQuickCustomer } from "@/lib/actions/billing";

export type CustomerOption = { id: string; name: string; phone: string | null };

export function CustomerCombobox({
  value,
  onSelect,
}: {
  value: CustomerOption | null;
  onSelect: (customer: CustomerOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!query.trim()) {
        setOptions([]);
        return;
      }
      startTransition(async () => {
        const results = await searchCustomers(query);
        setOptions(results);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function handleCreate() {
    if (!query.trim()) return;
    startTransition(async () => {
      const customer = await createQuickCustomer(query.trim(), newPhone || undefined);
      onSelect(customer);
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value ? `${value.name}${value.phone ? ` (${value.phone})` : ""}` : "Walk-in customer (optional)"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search name or phone..." value={query} onValueChange={setQuery} />
          <CommandList>
            {value && (
              <CommandItem onSelect={() => { onSelect(null); setOpen(false); }}>
                Clear selection (walk-in)
              </CommandItem>
            )}
            {!isPending && query && options.length === 0 && (
              <CommandEmpty>
                <div className="space-y-2 p-2">
                  <p className="text-sm">No customer found.</p>
                  <Input
                    placeholder="Phone (optional)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                  <Button type="button" size="sm" className="w-full" onClick={handleCreate}>
                    <UserPlus className="mr-1 h-4 w-4" /> Add &quot;{query}&quot;
                  </Button>
                </div>
              </CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === option.id ? "opacity-100" : "opacity-0")} />
                  {option.name} {option.phone && `(${option.phone})`}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
