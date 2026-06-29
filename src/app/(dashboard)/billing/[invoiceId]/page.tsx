import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/lib/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/billing/print-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  let detail: Awaited<ReturnType<typeof getInvoiceDetail>>;
  try {
    detail = await getInvoiceDetail(invoiceId);
  } catch {
    notFound();
  }

  const { invoice, items } = detail;
  const customer = invoice.customers as unknown as { name: string; phone: string | null } | null;
  const org = invoice.organizations as unknown as { name: string } | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">Invoice</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/billing">New sale</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <Card className="mx-auto max-w-2xl print:shadow-none print:ring-0">
        <CardHeader className="flex flex-col gap-1 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{org?.name ?? "Invoice"}</CardTitle>
            <Badge variant={invoice.status === "returned" ? "destructive" : "secondary"}>
              {invoice.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.invoice_no} &middot; {new Date(invoice.created_at).toLocaleString()}
          </p>
          {customer && (
            <p className="text-sm text-muted-foreground">
              Billed to: {customer.name}
              {customer.phone ? ` (${customer.phone})` : ""}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Medicine</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Disc %</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const batch = item.medicine_batches as unknown as {
                  batch_no: string;
                  medicines: { name: string; unit: string | null } | null;
                } | null;
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">
                      {batch?.medicines?.name ?? "—"}
                      <span className="ml-1 text-xs text-muted-foreground">{batch?.batch_no}</span>
                    </td>
                    <td className="py-2 text-right">{item.qty}</td>
                    <td className="py-2 text-right">{item.unit_rate.toFixed(2)}</td>
                    <td className="py-2 text-right">{item.discount_pct}</td>
                    <td className="py-2 text-right">{item.line_total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{invoice.discount_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Grand total</span>
              <span>{invoice.grand_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment mode</span>
              <span className="capitalize">{invoice.payment_mode}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
