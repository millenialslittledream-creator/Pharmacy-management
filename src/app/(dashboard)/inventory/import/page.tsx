import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkImport } from "@/components/inventory/bulk-import";
import { StockTemplateDialog } from "@/components/inventory/stock-template-dialog";
import { requireOrgId } from "@/lib/actions/require-org";
import { getStockTemplate } from "@/lib/actions/inventory";

export default async function BulkImportPage() {
  const [{ role }, fields] = await Promise.all([requireOrgId(), getStockTemplate()]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Bulk import stock</h1>
        <div className="flex gap-2">
          {role === "ceo" && <StockTemplateDialog fields={fields} />}
          <Button asChild variant="outline">
            <Link href="/inventory">Back to inventory</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload a CSV or Excel file</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkImport fields={fields} />
        </CardContent>
      </Card>
    </div>
  );
}
