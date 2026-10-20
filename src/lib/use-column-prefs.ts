"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const CHANGE_EVENT = "column-prefs-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * Remembers which table columns are shown and in what order, per browser.
 * Stored value is the ordered list of visible column ids; anything not in
 * `allowed` (e.g. a column the user's role may no longer see) is dropped.
 */
export function useColumnPrefs(storageKey: string, defaults: string[], allowed: string[]) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(storageKey),
    () => null,
  );
  const defaultsKey = defaults.join(",");
  const allowedKey = allowed.join(",");

  const columns = useMemo(() => {
    const allowedSet = new Set(allowedKey.split(","));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((id): id is string => typeof id === "string" && allowedSet.has(id));
          if (cleaned.length > 0) return Array.from(new Set(cleaned));
        }
      } catch {
        // fall through to defaults
      }
    }
    return defaultsKey.split(",").filter((id) => allowedSet.has(id));
  }, [raw, defaultsKey, allowedKey]);

  const save = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode) — preference just won't persist
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [storageKey]);

  return { columns, save, reset };
}
