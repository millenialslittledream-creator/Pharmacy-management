import { CeoDashboard } from "@/components/dashboard/ceo-dashboard";
import { getDashboardAlerts, getRevenueByDay, getTopSellingMedicines } from "@/lib/actions/dashboard";
import { presetToRange } from "@/lib/date-ranges";

export default async function CeoDashboardPage() {
  const { from, to } = presetToRange("month");
  const [alerts, revenue, topMedicines] = await Promise.all([
    getDashboardAlerts(),
    getRevenueByDay(from, to),
    getTopSellingMedicines(from, to, 10),
  ]);

  return (
    <CeoDashboard
      alerts={alerts ?? null}
      initialRevenue={revenue}
      initialTopMedicines={topMedicines}
    />
  );
}
