import Link from "next/link";
import { requireOrgId } from "@/lib/actions/require-org";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMedicineDialog } from "@/components/inventory/add-medicine-dialog";
import { AddBatchDialog } from "@/components/inventory/add-batch-dialog";
import { InventoryTable, type StockRow } from "@/components/inventory/inventory-table";

export default async function InventoryPage() {
  const { supabase, userId, role } = await requireOrgId();
  const isCeo = role === "ceo";
  const { data } = await supabase
    .from("medicine_stock_summary")
    .select("*")
    .order("name");

  // The view already returns no cost to non-CEOs; this keeps it out of the
  // page payload even if that ever changed.
  const rows: StockRow[] = (data ?? []).map((r) => (isCeo ? r : { ...r, avg_purchase_rate: null }));
  const lowStock = rows.filter((r) => r.reorder_level != null && (r.total_qty ?? 0) < r.reorder_level);

  const ninetyDaysOut = new Date();
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
  const expiringSoon = rows.filter(
    (r) => r.nearest_expiry && new Date(r.nearest_expiry) <= ninetyDaysOut,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/import">Bulk Import</Link>
          </Button>
          <AddBatchDialog />
          <AddMedicineDialog />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock ({lowStock.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon ({expiringSoon.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <InventoryTable rows={rows} isCeo={isCeo} userId={userId} />
        </TabsContent>
        <TabsContent value="low-stock">
          <InventoryTable rows={lowStock} isCeo={isCeo} userId={userId} />
        </TabsContent>
        <TabsContent value="expiring">
          <InventoryTable rows={expiringSoon} isCeo={isCeo} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
