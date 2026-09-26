import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, isWhatsAppServiceReachable } from "@/lib/whatsapp";

// Expiring-soon window matches the 90-day threshold already used by the
// "Expiring Soon" inventory tab and the dashboard_alerts RPC.
const EXPIRING_SOON_DAYS = 90;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name, whatsapp_enabled, whatsapp_alert_number");
  if (orgsError) throw orgsError;

  const expiryCutoff = new Date();
  expiryCutoff.setDate(expiryCutoff.getDate() + EXPIRING_SOON_DAYS);
  const expiryCutoffStr = expiryCutoff.toISOString().slice(0, 10);

  let notificationsCreated = 0;
  let whatsappAlertsSent = 0;

  for (const org of orgs ?? []) {
    const { data: existingUnread, error: existingError } = await supabase
      .from("notifications")
      .select("type, medicine_id")
      .eq("org_id", org.id)
      .is("read_at", null);
    if (existingError) throw existingError;
    const existingKeys = new Set(
      (existingUnread ?? []).map((n) => `${n.type}:${n.medicine_id}`),
    );

    const rows: { org_id: string; type: "low_stock" | "expiring_soon" | "whatsapp_down"; medicine_id: string | null; title: string; message: string }[] = [];

    const { data: stock, error: stockError } = await supabase
      .from("medicine_stock_summary")
      .select("medicine_id, name, total_qty, reorder_level, nearest_expiry")
      .eq("org_id", org.id);
    if (stockError) throw stockError;

    const lowStock = (stock ?? []).filter(
      (row) => row.reorder_level != null && (row.total_qty ?? 0) < row.reorder_level,
    );
    const expiringSoon = (stock ?? []).filter(
      (row) => (row.total_qty ?? 0) > 0 && row.nearest_expiry && row.nearest_expiry <= expiryCutoffStr,
    );

    for (const row of lowStock) {
      if (row.medicine_id && !existingKeys.has(`low_stock:${row.medicine_id}`)) {
        rows.push({
          org_id: org.id,
          type: "low_stock",
          medicine_id: row.medicine_id,
          title: `Low stock: ${row.name}`,
          message: `${row.total_qty ?? 0} left, reorder level is ${row.reorder_level}.`,
        });
      }
    }
    for (const row of expiringSoon) {
      if (row.medicine_id && !existingKeys.has(`expiring_soon:${row.medicine_id}`)) {
        rows.push({
          org_id: org.id,
          type: "expiring_soon",
          medicine_id: row.medicine_id,
          title: `Expiring soon: ${row.name}`,
          message: `Nearest batch expires ${row.nearest_expiry} (${row.total_qty ?? 0} in stock).`,
        });
      }
    }

    // Only alerts when the service itself is unreachable (VM down, process
    // crashed) — a normal "not yet linked" status is not an outage.
    if (org.whatsapp_enabled && !existingKeys.has("whatsapp_down:null")) {
      const reachable = await isWhatsAppServiceReachable(org.id);
      if (!reachable) {
        rows.push({
          org_id: org.id,
          type: "whatsapp_down",
          medicine_id: null,
          title: "WhatsApp service unreachable",
          message: `${org.name}: could not reach the WhatsApp service — invoice receipts and alerts are not being sent.`,
        });
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("notifications").insert(rows);
      if (insertError) throw insertError;
      notificationsCreated += rows.length;
    }

    if (lowStock.length > 0 && org.whatsapp_enabled && org.whatsapp_alert_number) {
      const lines = lowStock
        .slice(0, 15)
        .map((row) => `- ${row.name}: ${row.total_qty ?? 0} left (reorder at ${row.reorder_level})`);
      const message = `${org.name}: ${lowStock.length} medicine(s) low on stock:\n${lines.join("\n")}`;
      await sendWhatsAppMessage(org.id, org.whatsapp_alert_number, message);
      whatsappAlertsSent += 1;
    }
  }

  return NextResponse.json({ orgsChecked: orgs?.length ?? 0, notificationsCreated, whatsappAlertsSent });
}
