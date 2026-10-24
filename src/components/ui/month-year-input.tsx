"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

// Text box that takes MM-YYYY and adds the dash itself as you type.
export function MonthYearInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="MM-YYYY"
      maxLength={7}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        // Don't fight the user while they delete.
        if (raw.length < value.length) return onChange(raw);
        const digits = raw.replace(/\D/g, "").slice(0, 6);
        onChange(digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits);
      }}
    />
  );
}
