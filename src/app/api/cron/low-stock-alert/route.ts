import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name, whatsapp_alert_number")
    .eq("whatsapp_enabled", true)
    .not("whatsapp_alert_number", "is", null);
  if (orgsError) throw orgsError;

  let alertsSent = 0;

  for (const org of orgs ?? []) {
    const { data: stock, error: stockError } = await supabase
      .from("medicine_stock_summary")
      .select("name, total_qty, reorder_level")
      .eq("org_id", org.id);
    if (stockError) throw stockError;

    const lowStock = (stock ?? []).filter(
      (row) => row.reorder_level != null && (row.total_qty ?? 0) < row.reorder_level,
    );
    if (lowStock.length === 0) continue;

    const lines = lowStock
      .slice(0, 15)
      .map((row) => `- ${row.name}: ${row.total_qty ?? 0} left (reorder at ${row.reorder_level})`);
    const message = `${org.name}: ${lowStock.length} medicine(s) low on stock:\n${lines.join("\n")}`;

    await sendWhatsAppMessage(org.whatsapp_alert_number!, message);
    alertsSent += 1;
  }

  return NextResponse.json({ orgsChecked: orgs?.length ?? 0, alertsSent });
}
