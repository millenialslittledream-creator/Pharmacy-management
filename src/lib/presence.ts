const ACTIVE_NOW_MS = 5 * 60 * 1000;
const ACTIVE_TODAY_MS = 24 * 60 * 60 * 1000;

export type PresenceStatus = "online" | "today" | "inactive" | "never";

export function getPresence(lastSeenAt: string | null, lastSignInAt: string | null) {
  const times = [lastSeenAt, lastSignInAt]
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime());
  if (times.length === 0) return { status: "never" as PresenceStatus, lastActive: null };

  const last = Math.max(...times);
  const age = Date.now() - last;
  const status: PresenceStatus =
    age <= ACTIVE_NOW_MS ? "online" : age <= ACTIVE_TODAY_MS ? "today" : "inactive";
  return { status, lastActive: new Date(last) };
}

export function formatLastActive(date: Date | null) {
  if (!date) return "Never signed in";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return date.toLocaleDateString();
}
