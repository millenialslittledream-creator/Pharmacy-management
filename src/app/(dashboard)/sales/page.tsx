import { SalesDashboard } from "@/components/dashboard/sales-dashboard";
import { getRevenueByDay, getSalesSummary } from "@/lib/actions/dashboard";
import { presetToRange } from "@/lib/date-ranges";

export default async function SalesDashboardPage() {
  const { from, to } = presetToRange("today");
  const [summary, revenue] = await Promise.all([
    getSalesSummary(from, to),
    getRevenueByDay(from, to),
  ]);

  return <SalesDashboard initialSummary={summary ?? null} initialRevenue={revenue} />;
}
