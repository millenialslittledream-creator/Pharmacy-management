# Pharrmasy WhatsApp service

Standalone Node service that holds one WhatsApp session (via `@whiskeysockets/baileys`)
and exposes a single authenticated endpoint the main app calls to send messages.
It is deployed separately from the Next.js app because it needs an always-on
process — Vercel functions cannot hold a persistent WhatsApp connection.

## Deploy to Railway (free tier)

1. Create a Railway account at railway.app and a new project.
2. Add this `whatsapp-service` folder as its own service (point Railway at this
   subfolder of the repo, or push it as its own repo — either works).
3. Add a **volume** mounted at `/app/auth_info` (Railway → service → Settings →
   Volumes). Without this, every redeploy wipes the session and you'll have to
   re-scan the QR code.
4. Set the environment variable `API_SECRET` to a long random string — this is
   the shared secret the main app sends as the `x-api-secret` header.
5. Deploy. Watch the logs or open `https://<your-service>.up.railway.app/qr`
   in a browser.
6. On the pharmacy's WhatsApp phone: Settings → Linked Devices → Link a Device,
   then scan the QR shown at `/qr`. Once linked, `/status` reports
   `{"status":"connected"}` and the session persists (thanks to the volume)
   across redeploys.

## Wiring into the main app

In the Next.js project's environment variables (Vercel → Project → Settings →
Environment Variables), set:

- `WHATSAPP_SERVICE_URL` — the Railway service's public URL, e.g.
  `https://pharrmasy-whatsapp.up.railway.app`
- `WHATSAPP_SERVICE_SECRET` — same value as `API_SECRET` above

The main app calls `POST /send` with `{ "phone": "91XXXXXXXXXX", "message": "..." }`
and the `x-api-secret` header. Sends never block or fail a sale — failures are
caught and logged only.

## Risk note

`baileys` automates WhatsApp's consumer protocol unofficially (not the official
WhatsApp Business Cloud API). This is free and requires no business
verification, but carries a ban risk if message volume looks automated/spammy.
Keep volume to transactional receipts and the daily low-stock alert — avoid
bulk/marketing sends on this number.
