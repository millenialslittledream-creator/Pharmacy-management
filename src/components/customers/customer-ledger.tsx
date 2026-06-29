import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LedgerInvoice = {
  id: string;
  invoice_no: string;
  created_at: string;
  payment_mode: string;
  status: string;
  grand_total: number;
};
type LedgerPayment = { id: string; amount: number; method: string; created_at: string };

export function CustomerLedger({
  invoices,
  payments,
}: {
  invoices: LedgerInvoice[];
  payments: LedgerPayment[];
}) {
  const entries = [
    ...invoices
      .filter((inv) => inv.payment_mode === "credit" && inv.status !== "returned")
      .map((inv) => ({
        date: inv.created_at,
        label: `Invoice ${inv.invoice_no}`,
        debit: inv.grand_total,
        credit: 0,
      })),
    ...payments.map((p) => ({
      date: p.created_at,
      label: `Payment (${p.method})`,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const rows = entries.reduce<Array<(typeof entries)[number] & { balance: number }>>(
    (acc, e) => {
      const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      acc.push({ ...e, balance: prevBalance + e.debit - e.credit });
      return acc;
    },
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead className="text-right">Charged</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No credit activity yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{new Date(r.date).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{r.label}</TableCell>
                <TableCell className="text-right text-sm">{r.debit > 0 ? r.debit.toFixed(2) : "—"}</TableCell>
                <TableCell className="text-right text-sm">{r.credit > 0 ? r.credit.toFixed(2) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.balance > 0 ? "destructive" : "secondary"}>{r.balance.toFixed(2)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
