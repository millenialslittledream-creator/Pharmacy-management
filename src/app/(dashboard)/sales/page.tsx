import { SalesDashboard } from "@/components/dashboard/sales-dashboard";
import { getRevenueByHour, getSalesByMember, getSalesSummary } from "@/lib/actions/dashboard";
import { requireOrgId } from "@/lib/actions/require-org";
import { presetToRange } from "@/lib/date-ranges";

export default async function SalesDashboardPage() {
  const { from, to } = presetToRange("today");
  const [{ role }, summary, revenue, members] = await Promise.all([
    requireOrgId(),
    getSalesSummary(from, to),
    getRevenueByHour(from, to),
    getSalesByMember(from, to),
  ]);

  return (
    <SalesDashboard
      initialSummary={summary ?? null}
      initialRevenue={revenue.map((r) => ({ bucket: r.hour, total: r.total, order_count: r.order_count }))}
      initialGranularity="hour"
      initialMembers={members}
      isCeo={role === "ceo"}
    />
  );
}
