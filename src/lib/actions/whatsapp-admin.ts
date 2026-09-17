"use server";

import { requireOrgId } from "@/lib/actions/require-org";

async function callWhatsAppService(path: string, options?: { method?: "GET" | "POST" }) {
  const { role, orgId } = await requireOrgId();
  if (role !== "ceo") throw new Error("Not authorized");

  const url = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (!url || !secret) return null;

  const method = options?.method ?? "GET";
  const res = await fetch(
    method === "GET" ? `${url}${path}?orgId=${orgId}` : `${url}${path}`,
    {
      method,
      headers: {
        "x-api-secret": secret,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify({ orgId }) } : {}),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    },
  );
  if (!res.ok && res.status !== 404) throw new Error(`WhatsApp service error: ${res.status}`);
  return res.json();
}

export async function getWhatsAppStatus() {
  try {
    const data = await callWhatsAppService("/status");
    return data as { status: "connected" | "disconnected"; qrAvailable: boolean } | null;
  } catch {
    return null;
  }
}

export async function getWhatsAppQr() {
  try {
    const data = await callWhatsAppService("/qr");
    return data as { connected: boolean; qrDataUrl?: string } | null;
  } catch {
    return null;
  }
}

export async function getWhatsAppLogs() {
  try {
    const data = await callWhatsAppService("/logs");
    return (data?.logs ?? []) as { time: string; message: string; extra?: unknown }[];
  } catch {
    return [];
  }
}

export async function disconnectWhatsApp() {
  await callWhatsAppService("/logout", { method: "POST" });
}
