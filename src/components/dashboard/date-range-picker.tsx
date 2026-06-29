"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRangePreset } from "@/lib/date-ranges";

export function DateRangePicker({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomChange,
}: {
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="month">This month</SelectItem>
          <SelectItem value="year">This year</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
          />
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
          />
        </>
      )}
    </div>
  );
}
