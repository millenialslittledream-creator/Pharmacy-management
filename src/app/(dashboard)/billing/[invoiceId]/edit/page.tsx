import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceForEdit } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { EditInvoiceForm } from "@/components/billing/edit-invoice-form";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  let detail: Awaited<ReturnType<typeof getInvoiceForEdit>>;
  try {
    detail = await getInvoiceForEdit(invoiceId);
  } catch {
    notFound();
  }

  const { invoice, items } = detail;

  const initialItems = items.map((item) => {
    const batch = item.medicine_batches as unknown as {
      batch_no: string;
      medicines: { name: string } | null;
    } | null;
    return {
      medicineName: batch?.medicines?.name ?? "—",
      batchId: item.medicine_batch_id,
      batchNo: batch?.batch_no ?? "—",
      qty: item.qty,
      unitRate: item.unit_rate,
      discountPct: item.discount_pct,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Edit invoice {invoice.invoice_no}</h1>
        <Button asChild variant="outline">
          <Link href={`/billing/${invoiceId}`}>Cancel</Link>
        </Button>
      </div>
      <EditInvoiceForm
        invoiceId={invoiceId}
        isFree={invoice.is_free}
        initialDiscountTotal={invoice.discount_total}
        initialItems={initialItems}
      />
    </div>
  );
}
