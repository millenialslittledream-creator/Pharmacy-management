import { PosForm } from "@/components/billing/pos-form";
import { InvoiceList } from "@/components/billing/invoice-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
      <PosForm />
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
