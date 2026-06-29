"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchMedicines } from "@/lib/actions/inventory";

export type MedicineOption = {
  id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  unit: string | null;
  default_sale_rate: number | null;
  barcode: string | null;
};

export function MedicineCombobox({
  value,
  onSelect,
  placeholder = "Search medicine by name or generic name...",
}: {
  value: MedicineOption | null;
  onSelect: (medicine: MedicineOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<MedicineOption[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!query.trim()) {
        setOptions([]);
        return;
      }
      startTransition(async () => {
        const results = await searchMedicines(query);
        setOptions(results);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? value.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!isPending && query && options.length === 0 && (
              <CommandEmpty>No medicine found.</CommandEmpty>
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
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.id === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.name}</span>
                    {option.generic_name && (
                      <span className="text-xs text-muted-foreground">{option.generic_name}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
