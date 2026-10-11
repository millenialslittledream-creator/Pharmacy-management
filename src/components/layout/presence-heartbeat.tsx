"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_MS = 2 * 60 * 1000;

// Stamps "last seen" while the app is open and visible, so the CEO can tell
// which accounts are in use right now. The database ignores calls made less
// than 2 minutes after the previous stamp.
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();

    function beat() {
      if (document.visibilityState === "visible") {
        void supabase.rpc("touch_last_seen");
      }
    }

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
