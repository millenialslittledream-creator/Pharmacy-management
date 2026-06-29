import { PosForm } from "@/components/billing/pos-form";
import { InvoiceList } from "@/components/billing/invoice-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listQuickPicks } from "@/lib/actions/quick-picks";
import { requireOrgId } from "@/lib/actions/require-org";

export default async function BillingPage() {
  const [{ role }, quickPicks] = await Promise.all([requireOrgId(), listQuickPicks()]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
      <PosForm initialQuickPicks={quickPicks} canEditQuickPicks={role !== "staff"} />
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceList />
        </CardContent>
      </Card>
    </div>
  );
}
