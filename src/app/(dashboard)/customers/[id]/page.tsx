import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/actions/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getCustomerDetail>>;
  try {
    detail = await getCustomerDetail(id);
  } catch {
    notFound();
  }

  const { customer, invoices } = detail;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{customer.name}</h1>
        <Button asChild variant="outline">
          <Link href="/customers">Back</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Phone</CardTitle>
          </CardHeader>
          <CardContent>{customer.phone ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Loyalty points</CardTitle>
          </CardHeader>
          <CardContent>{customer.loyalty_points}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Outstanding balance</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.outstanding_balance > 0 ? (
              <Badge variant="destructive">{customer.outstanding_balance.toFixed(2)}</Badge>
            ) : (
              "0.00"
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Address</CardTitle>
          </CardHeader>
          <CardContent>{customer.address ?? "—"}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No purchases yet.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{inv.payment_mode}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "returned" ? "destructive" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{inv.grand_total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
