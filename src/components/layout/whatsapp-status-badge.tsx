"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWhatsAppStatus } from "@/lib/actions/whatsapp-admin";

const POLL_INTERVAL_MS = 20000;

export function WhatsAppStatusBadge() {
  const [status, setStatus] = useState<"connected" | "disconnected" | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await getWhatsAppStatus();
      if (!cancelled) setStatus(result?.status ?? null);
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (status === null) return null;

  const isConnected = status === "connected";

  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${isConnected ? "bg-emerald-500" : "bg-destructive animate-pulse"}`}
      />
      WhatsApp {isConnected ? "connected" : "disconnected"}
    </Link>
  );
}
