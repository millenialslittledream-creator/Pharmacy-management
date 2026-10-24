// Production Next.js replaces the text of any error thrown from a server
// action with a generic "Server Components render" message, so users saw
// nothing useful when they typed a bad date, a duplicate, etc. Actions the
// user triggers therefore catch their errors and *return* a readable
// message, and the client turns it back into a toast.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function rawMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

const TECHNICAL = /relation "|column "|syntax error|function public\.|schema |violates|\bpg_|\.js:|at async|stack/i;

/** Turns database / server errors into something a shop user can act on. */
export function friendlyError(err: unknown): string {
  const msg = rawMessage(err);
  if (!msg) return "Something went wrong. Please try again.";

  const rules: [RegExp, string][] = [
    [/invalid input syntax for type date|date\/time field value out of range|date out of range/i,
      "One of the dates isn't valid. Expiry and manufacturing dates must be month and year, like 06-2027."],
    [/invalid input syntax for type (numeric|integer|bigint|double|real)|numeric field overflow|out of range for type/i,
      "A number isn't valid. Check the quantities, rates and amounts you entered."],
    [/invalid input syntax for type uuid/i,
      "That item is no longer available. Refresh the page and try again."],
    [/insufficient stock for batch/i,
      "Not enough stock in that batch for the quantity entered. Lower the quantity or pick another batch."],
    [/duplicate key value|already exists|already been registered|already registered/i,
      "That already exists. Check for a duplicate and try again."],
    [/violates foreign key constraint/i,
      "This is linked to other records, so it can't be changed or removed."],
    [/violates check constraint/i,
      "A value is outside the allowed range. Check what you entered."],
    [/null value in column/i,
      "A required field is missing. Fill in everything marked *."],
    [/value too long|too long for type/i,
      "A text value is too long. Please shorten it."],
    [/permission denied|row-level security|not authorized|only the ceo/i,
      "You don't have permission to do that."],
    [/jwt expired|not authenticated|invalid jwt/i,
      "Your session has expired. Please sign in again."],
    [/fetch failed|econnrefused|etimedout|network|timed out/i,
      "Couldn't reach the server. Check your connection and try again."],
  ];
  for (const [pattern, message] of rules) {
    if (pattern.test(msg)) return message;
  }

  // Our own validation messages ("quantity must be greater than 0", …) are
  // already readable; raw database internals are not.
  if (TECHNICAL.test(msg)) {
    return "Something went wrong while saving. Please check what you entered and try again.";
  }
  return msg.charAt(0).toUpperCase() + msg.slice(1);
}

/** Runs a server action body and returns its result or a readable error. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // Let Next's own control-flow errors (redirect, notFound…) through.
    const digest = (err as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
    return { ok: false, error: friendlyError(err) };
  }
}

/** Client side: unwrap a Result, throwing an Error with the readable message. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/** Message for a toast from anything caught on the client. */
export function errorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (!msg || /Server Components render|omitted in production|digest/i.test(msg)) {
    return `${fallback}. If it keeps happening, please contact support.`;
  }
  return msg;
}
