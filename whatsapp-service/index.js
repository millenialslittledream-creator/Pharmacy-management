import express from "express";
import pino from "pino";
import QRCode from "qrcode";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";

const API_SECRET = process.env.API_SECRET;
if (!API_SECRET) {
  console.error("API_SECRET env var is required");
  process.exit(1);
}

let sock = null;
let latestQr = null;
let connectionStatus = "disconnected";

const MAX_LOGS = 100;
const recentLogs = [];
function logEvent(message, extra) {
  const entry = { time: new Date().toISOString(), message, ...(extra ? { extra } : {}) };
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOGS) recentLogs.shift();
  console.log(message, extra ?? "");
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQr = qr;
      logEvent("New QR code generated");
    }
    if (connection === "open") {
      connectionStatus = "connected";
      latestQr = null;
      logEvent("WhatsApp connected");
    }
    if (connection === "close") {
      connectionStatus = "disconnected";
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logEvent("WhatsApp connection closed", { statusCode, shouldReconnect });
      if (shouldReconnect) setTimeout(connectToWhatsApp, 5000);
    }
  });
}

connectToWhatsApp();

const app = express();
app.use(express.json({ limit: "10mb" }));

function requireAuth(req, res, next) {
  if (req.headers["x-api-secret"] !== API_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/status", requireAuth, (req, res) => {
  res.json({ status: connectionStatus, qrAvailable: !!latestQr });
});

app.get("/qr", requireAuth, async (req, res) => {
  if (connectionStatus === "connected") {
    return res.json({ connected: true });
  }
  if (!latestQr) {
    return res.status(404).json({ error: "No QR available yet" });
  }
  const qrDataUrl = await QRCode.toDataURL(latestQr);
  res.json({ connected: false, qrDataUrl });
});

app.get("/logs", requireAuth, (req, res) => {
  res.json({ logs: [...recentLogs].reverse() });
});

app.post("/send", requireAuth, async (req, res) => {
  const { phone, message, documentBase64, fileName } = req.body ?? {};
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }
  if (connectionStatus !== "connected" || !sock) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }
  try {
    const digits = String(phone).replace(/\D/g, "");
    const jid = `${digits}@s.whatsapp.net`;
    if (documentBase64) {
      await sock.sendMessage(jid, {
        document: Buffer.from(documentBase64, "base64"),
        fileName: fileName || "invoice.pdf",
        mimetype: "application/pdf",
        caption: message,
      });
    } else {
      await sock.sendMessage(jid, { text: message });
    }
    logEvent("Message sent", { phone: digits, hasDocument: !!documentBase64 });
    res.json({ ok: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "send failed";
    logEvent("Message send failed", { phone, error: errorMessage });
    res.status(500).json({ error: errorMessage });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logEvent(`WhatsApp service listening on port ${PORT}`));
