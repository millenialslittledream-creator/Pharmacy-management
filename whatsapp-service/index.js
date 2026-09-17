import express from "express";
import pino from "pino";
import QRCode from "qrcode";
import { promises as fs } from "fs";
import path from "path";
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

// One WhatsApp connection per organization — each org links its own phone
// number, so their session state (socket, QR, status, logs) must never be
// shared with another org. Keyed by orgId.
const sessions = new Map();
const ORG_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MAX_LOGS = 100;
const AUTH_DIR = "auth_info";

function isValidOrgId(orgId) {
  return typeof orgId === "string" && ORG_ID_RE.test(orgId);
}

function authPath(orgId) {
  // orgId is validated against ORG_ID_RE before this is ever called, so it
  // cannot contain path-traversal characters.
  return path.join(AUTH_DIR, orgId);
}

function logEvent(session, message, extra) {
  const entry = { time: new Date().toISOString(), message, ...(extra ? { extra } : {}) };
  session.recentLogs.push(entry);
  if (session.recentLogs.length > MAX_LOGS) session.recentLogs.shift();
  console.log(`[${session.orgId}]`, message, extra ?? "");
}

function getOrCreateSession(orgId) {
  let session = sessions.get(orgId);
  if (!session) {
    session = {
      orgId,
      sock: null,
      latestQr: null,
      connectionStatus: "disconnected",
      recentLogs: [],
      connecting: false,
      reconnectTimer: null,
    };
    sessions.set(orgId, session);
  }
  return session;
}

async function connectToWhatsApp(session) {
  if (session.connecting) return;
  session.connecting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authPath(session.orgId));
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      auth: state,
      version,
      logger: pino({ level: "silent" }),
    });
    session.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        session.latestQr = qr;
        logEvent(session, "New QR code generated");
      }
      if (connection === "open") {
        session.connectionStatus = "connected";
        session.latestQr = null;
        logEvent(session, "WhatsApp connected");
      }
      if (connection === "close") {
        session.connectionStatus = "disconnected";
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logEvent(session, "WhatsApp connection closed", { statusCode, shouldReconnect });
        if (shouldReconnect) {
          clearTimeout(session.reconnectTimer);
          session.reconnectTimer = setTimeout(() => {
            session.connecting = false;
            connectToWhatsApp(session);
          }, 5000);
        }
      }
    });
  } finally {
    session.connecting = false;
  }
}

function ensureSession(orgId) {
  const session = getOrCreateSession(orgId);
  if (!session.sock && !session.connecting) {
    connectToWhatsApp(session).catch((err) =>
      logEvent(session, "Failed to start connection", { error: err instanceof Error ? err.message : String(err) }),
    );
  }
  return session;
}

const app = express();
app.use(express.json({ limit: "10mb" }));

function requireAuth(req, res, next) {
  if (req.headers["x-api-secret"] !== API_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function requireOrgId(getOrgId) {
  return (req, res, next) => {
    const orgId = getOrgId(req);
    if (!isValidOrgId(orgId)) {
      return res.status(400).json({ error: "orgId (uuid) is required" });
    }
    req.orgId = orgId;
    next();
  };
}

app.get(
  "/status",
  requireAuth,
  requireOrgId((req) => req.query.orgId),
  (req, res) => {
    const session = ensureSession(req.orgId);
    res.json({ status: session.connectionStatus, qrAvailable: !!session.latestQr });
  },
);

app.get(
  "/qr",
  requireAuth,
  requireOrgId((req) => req.query.orgId),
  async (req, res) => {
    const session = ensureSession(req.orgId);
    if (session.connectionStatus === "connected") {
      return res.json({ connected: true });
    }
    if (!session.latestQr) {
      return res.status(404).json({ error: "No QR available yet" });
    }
    const qrDataUrl = await QRCode.toDataURL(session.latestQr);
    res.json({ connected: false, qrDataUrl });
  },
);

app.get(
  "/logs",
  requireAuth,
  requireOrgId((req) => req.query.orgId),
  (req, res) => {
    const session = getOrCreateSession(req.orgId);
    res.json({ logs: [...session.recentLogs].reverse() });
  },
);

app.post(
  "/send",
  requireAuth,
  requireOrgId((req) => req.body?.orgId),
  async (req, res) => {
    const { phone, message, documentBase64, fileName } = req.body ?? {};
    if (!phone || !message) {
      return res.status(400).json({ error: "phone and message are required" });
    }
    const session = ensureSession(req.orgId);
    if (session.connectionStatus !== "connected" || !session.sock) {
      return res.status(503).json({ error: "WhatsApp not connected" });
    }
    try {
      const digits = String(phone).replace(/\D/g, "");
      const jid = `${digits}@s.whatsapp.net`;
      if (documentBase64) {
        await session.sock.sendMessage(jid, {
          document: Buffer.from(documentBase64, "base64"),
          fileName: fileName || "invoice.pdf",
          mimetype: "application/pdf",
          caption: message,
        });
      } else {
        await session.sock.sendMessage(jid, { text: message });
      }
      logEvent(session, "Message sent", { phone: digits, hasDocument: !!documentBase64 });
      res.json({ ok: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "send failed";
      logEvent(session, "Message send failed", { phone, error: errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  },
);

// Lets an org unlink its number (e.g. wrong phone scanned) and get a fresh
// QR without touching any other org's session.
app.post(
  "/logout",
  requireAuth,
  requireOrgId((req) => req.body?.orgId),
  async (req, res) => {
    const session = getOrCreateSession(req.orgId);
    clearTimeout(session.reconnectTimer);
    try {
      await session.sock?.logout();
    } catch {
      // ignore — we're tearing this session down regardless
    }
    session.sock = null;
    session.latestQr = null;
    session.connectionStatus = "disconnected";
    session.connecting = false;
    await fs.rm(authPath(req.orgId), { recursive: true, force: true });
    logEvent(session, "Session logged out and reset");
    res.json({ ok: true });
  },
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`WhatsApp service listening on port ${PORT}`));
