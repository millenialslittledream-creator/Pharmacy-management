const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

function build(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || year < 1900 || year > 2200) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthIndex(name: string): number | null {
  const i = MONTHS.indexOf(name.slice(0, 3).toLowerCase());
  return i === -1 ? null : i + 1;
}

/**
 * Turns the date styles people actually type into YYYY-MM-DD. Day comes
 * first (Indian style) for ambiguous values like 05/06/2027. A month and year
 * only ("06/2027", "Jun-27") means the last day of that month when
 * `monthOnly` is "end" (expiry dates) or the first day when "start" (mfg).
 * Returns null when the value isn't a recognisable date.
 */
export function normalizeDate(value: unknown, monthOnly: "start" | "end" = "end"): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return build(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === "number") {
    // Excel serial day number
    if (value < 20000 || value > 80000) return null;
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return build(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{5}$/.test(s)) return normalizeDate(Number(s), monthOnly);

  const monthEdge = (year: number, month: number) =>
    build(year, month, monthOnly === "end" ? daysInMonth(year, month) : 1);

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
  if (m) return build(fullYear(m[3]), Number(m[2]), Number(m[1]));

  m = s.match(/^(\d{1,2})[-/.](\d{4}|\d{2})$/);
  if (m) return monthEdge(fullYear(m[2]), Number(m[1]));

  m = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) return monthEdge(Number(m[1]), Number(m[2]));

  m = s.match(/^([A-Za-z]{3,9})[\s\-/.,]*(\d{4}|\d{2})$/);
  if (m) {
    const month = monthIndex(m[1]);
    return month ? monthEdge(fullYear(m[2]), month) : null;
  }

  m = s.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3,9})[\s\-/.,]*(\d{4}|\d{2})$/);
  if (m) {
    const month = monthIndex(m[2]);
    return month ? build(fullYear(m[3]), month, Number(m[1])) : null;
  }

  return null;
}

/** "2027-06-30" -> "06-2027" (what people see and type for expiry / mfg). */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}-${m[1]}` : String(iso);
}

/**
 * Expiry and manufacturing dates are entered as month + year. Returns
 * YYYY-MM-DD (last day of the month for expiry, first for mfg) or an error
 * message to show the user. Years before 2000 are refused: they're nearly
 * always a typo or a spreadsheet that stored "Jun-29" as 1929.
 */
export function parseMonthYear(
  value: unknown,
  kind: "expiry" | "mfg",
): { date: string } | { error: string } {
  const iso = normalizeDate(value, kind === "expiry" ? "end" : "start");
  const label = kind === "expiry" ? "expiry" : "manufacturing";
  if (!iso) return { error: `"${String(value ?? "")}" isn't a valid ${label} date — use MM-YYYY, e.g. 06-2027` };
  const year = Number(iso.slice(0, 4));
  if (year < 2000 || year > 2100) {
    return { error: `${label} year ${year} doesn't look right — type the full year, e.g. 06-2027` };
  }
  return { date: iso };
}
