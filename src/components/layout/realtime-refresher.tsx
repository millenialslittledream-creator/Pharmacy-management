"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["invoices", "medicine_batches", "customers", "payments"] as const;
const DEBOUNCE_MS = 400;

export function RealtimeRefresher({ orgId }: { orgId: string }) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function scheduleRefresh() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    }

    async function setup() {
      // Supabase only syncs the Realtime auth token automatically on
      // TOKEN_REFRESHED/SIGNED_IN events, not on a normal page load where
      // the session already exists — so it must be set explicitly here,
      // otherwise postgres_changes subscribes as `anon` and RLS silently
      // drops every event.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase.channel(`org-${orgId}-changes`);
      for (const table of TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` },
          scheduleRefresh,
        );
      }
      channel.subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
