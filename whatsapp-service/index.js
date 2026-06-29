import express from "express";
import pino from "pino";
import QRCode from "qrcode";
import {
  default as makeWASocket,
  useMultiFileAuthState,
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

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQr = qr;
      console.log("New QR code generated — visit /qr on this service to scan it.");
    }
    if (connection === "open") {
      connectionStatus = "connected";
      latestQr = null;
      console.log("WhatsApp connected.");
    }
    if (connection === "close") {
      connectionStatus = "disconnected";
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("WhatsApp connection closed.", { statusCode, shouldReconnect });
      if (shouldReconnect) connectToWhatsApp();
    }
  });
}

connectToWhatsApp();

const app = express();
app.use(express.json());

function requireAuth(req, res, next) {
  if (req.headers["x-api-secret"] !== API_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/status", (req, res) => {
  res.json({ status: connectionStatus, qrAvailable: !!latestQr });
});

app.get("/qr", async (req, res) => {
  if (connectionStatus === "connected") {
    return res.send("Already connected — no QR needed.");
  }
  if (!latestQr) {
    return res.status(404).send("No QR available yet. Refresh in a few seconds.");
  }
  const dataUrl = await QRCode.toDataURL(latestQr);
  res.send(`<html><body style="display:flex;justify-content:center;padding-top:2rem">
    <img src="${dataUrl}" alt="Scan with WhatsApp" />
  </body></html>`);
});

app.post("/send", requireAuth, async (req, res) => {
  const { phone, message } = req.body ?? {};
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }
  if (connectionStatus !== "connected" || !sock) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }
  try {
    const digits = String(phone).replace(/\D/g, "");
    const jid = `${digits}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "send failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`WhatsApp service listening on port ${PORT}`));
