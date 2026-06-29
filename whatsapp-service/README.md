# Pharrmasy WhatsApp service

Standalone Node service that holds one WhatsApp session (via `@whiskeysockets/baileys`)
and exposes a single authenticated endpoint the main app calls to send messages.
It is deployed separately from the Next.js app because it needs an always-on
process — Vercel functions cannot hold a persistent WhatsApp connection.

Railway dropped its free tier in 2023 (now ~$5/mo minimum), so this uses a free
always-on VM instead. **Try Oracle Cloud first** (more generous specs); if VM
creation fails with an "out of capacity" error (a known, common Oracle issue),
**fall back to GCP** (smaller VM, but reliably available). Steps 2–4 below are
identical either way — only VM creation and port-opening differ.

## 1a. Create the VM — Oracle Cloud (try this first)

1. Sign up at https://www.oracle.com/cloud/free/ (a card is required for
   identity verification, but Always Free resources are never charged).
2. Console → Compute → Instances → Create Instance.
3. Image: **Ubuntu 22.04**. Shape: click "Change shape" → Ampere → **VM.Standard.A1.Flex**,
   set 1 OCPU / 6 GB memory (well inside the always-free 4 OCPU/24GB allowance).
4. Add your SSH key (or let Oracle generate one and download it) so you can log in.
5. Click Create.

If this fails with "Out of host capacity" — that's Oracle's free Ampere
shape being oversubscribed in your region. You can keep retrying (people often
succeed within a day), or just switch to 1b below instead of waiting.

6. Once created, note the instance's **public IP address** and skip to step 2.

## 1b. Create the VM — GCP (fallback if Oracle is out of capacity)

1. Sign up at https://cloud.google.com/free (a card is required for
   verification; you also get a $300/90-day trial credit on top of the
   permanent always-free resources).
2. Console → Compute Engine → VM Instances → Create Instance.
3. Name it, and set **Region to `us-central1` (Iowa)** — the always-free
   e2-micro instance is only free in `us-west1`, `us-central1`, or `us-east1`.
4. Machine type: **e2-micro** (this is the free one — don't change it).
5. Boot disk: Ubuntu 22.04, up to 30GB standard persistent disk (within the
   free allowance).
6. Under Firewall, check "Allow HTTP traffic" (we'll open the specific port
   separately below).
7. Create. Note the instance's **External IP**.

## 2. Open the port

Port 3001 needs to be reachable from the internet. Both platforms block it by
default.

**Oracle:**
- OCI Security List: Networking → Virtual Cloud Networks → your VCN →
  Security Lists → Default Security List → Add Ingress Rule: source `0.0.0.0/0`,
  destination port `3001`, TCP.
- VM firewall — SSH in (`ssh ubuntu@<public-ip>`) and run:
  ```bash
  sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
  sudo netfilter-persistent save
  ```

**GCP:**
- Console → VPC Network → Firewall → Create Firewall Rule: targets "All
  instances in the network", source range `0.0.0.0/0`, protocol/port
  `tcp:3001`.
- SSH in via the Console's built-in "SSH" button (no key setup needed) or
  `gcloud compute ssh`.

## 3. Install Node and the service

SSH into whichever VM you created and run:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

git clone https://github.com/millenialslittledream-creator/Pharmacy-management.git
cd Pharmacy-management/whatsapp-service
npm install

export API_SECRET="<paste a long random string here>"
pm2 start index.js --name whatsapp --env API_SECRET="$API_SECRET"
pm2 save
pm2 startup   # run the command it prints, so the service survives a VM reboot
```

## 4. Scan the QR code

Open `http://<public-ip>:3001/qr` in a browser. On the pharmacy's WhatsApp
phone: Settings → Linked Devices → Link a Device, then scan it. Once linked,
`http://<public-ip>:3001/status` reports `{"status":"connected"}` and the
session persists in the `auth_info` folder across VM reboots (pm2 restarts the
same process on the same disk — no ephemeral filesystem like on serverless
platforms).

`WHATSAPP_SERVICE_URL` (set in Vercel) is `http://<public-ip>:3001`.
`WHATSAPP_SERVICE_SECRET` (set in Vercel) must exactly match the `API_SECRET`
you exported above.

Traffic to this VM is plain HTTP — acceptable here since it's a
server-to-server call from Vercel guarded by the shared secret, not a
public-facing page. If you later get a free domain (e.g. via DuckDNS) you can
add Caddy in front for automatic HTTPS, but it isn't required to get this
working.

## Wiring into the main app

In the Next.js project's environment variables (Vercel → Project → Settings →
Environment Variables), set:

- `WHATSAPP_SERVICE_URL` — the VM's address from step 4 above, e.g.
  `http://140.x.x.x:3001`
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
