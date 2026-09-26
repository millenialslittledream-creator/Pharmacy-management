// Distinguishes "the whatsapp-service VM/process is unreachable" (a real
// outage worth alerting on) from "connected: false" (normal — nobody has
// scanned a QR yet, not an outage).
export async function isWhatsAppServiceReachable(orgId: string): Promise<boolean> {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (!url || !secret) return true; // not configured — nothing to alert on

  try {
    const res = await fetch(`${url}/status?orgId=${orgId}`, {
      headers: { "x-api-secret": secret },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(
  orgId: string,
  phone: string,
  message: string,
  document?: { buffer: Buffer; fileName: string },
) {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (!url || !secret) return;

  try {
    await fetch(`${url}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": secret },
      body: JSON.stringify({
        orgId,
        phone,
        message,
        documentBase64: document?.buffer.toString("base64"),
        fileName: document?.fileName,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
}
