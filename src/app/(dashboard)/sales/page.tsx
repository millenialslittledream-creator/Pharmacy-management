import { SalesDashboard } from "@/components/dashboard/sales-dashboard";
import { getRevenueByHour, getSalesSummary } from "@/lib/actions/dashboard";
import { presetToRange } from "@/lib/date-ranges";

export default async function SalesDashboardPage() {
  const { from, to } = presetToRange("today");
  const [summary, revenue] = await Promise.all([
    getSalesSummary(from, to),
    getRevenueByHour(from, to),
  ]);

  return (
    <SalesDashboard
      initialSummary={summary ?? null}
      initialRevenue={revenue.map((r) => ({ bucket: r.hour, total: r.total, order_count: r.order_count }))}
      initialGranularity="hour"
    />
  );
}
