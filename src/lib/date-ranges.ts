export type DateRangePreset = "today" | "week" | "month" | "year" | "custom";

export function presetToRange(preset: DateRangePreset, customFrom?: string, customTo?: string) {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 1);
  to.setHours(0, 0, 0, 0);

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      break;
    case "week":
      from.setDate(from.getDate() - from.getDay());
      break;
    case "month":
      from.setDate(1);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
    case "custom":
      return {
        from: customFrom ? new Date(customFrom).toISOString() : from.toISOString(),
        to: customTo ? new Date(new Date(customTo).getTime() + 86400000).toISOString() : to.toISOString(),
      };
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

/** Day-level buckets collapse to a single bar for one-day ranges, so those need hourly buckets instead. */
export function isSingleDayRange(preset: DateRangePreset, customFrom?: string, customTo?: string) {
  if (preset === "today") return true;
  if (preset === "custom") return !!customFrom && (!customTo || customTo === customFrom);
  return false;
}

export function formatHourLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric" });
}
