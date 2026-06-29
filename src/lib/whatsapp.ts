export async function sendWhatsAppMessage(phone: string, message: string) {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (!url || !secret) return;

  try {
    await fetch(`${url}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": secret },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
}
