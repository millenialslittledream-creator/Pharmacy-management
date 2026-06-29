import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkImport } from "@/components/inventory/bulk-import";

export default function BulkImportPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Bulk import stock</h1>
        <Button asChild variant="outline">
          <Link href="/inventory">Back to inventory</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload a CSV or Excel file</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkImport />
        </CardContent>
      </Card>
    </div>
  );
}
