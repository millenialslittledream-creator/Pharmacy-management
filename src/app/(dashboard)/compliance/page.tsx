import { getScheduledDrugRegister } from "@/lib/actions/compliance";
import { ComplianceRegister } from "@/components/compliance/compliance-register";
import { presetToRange } from "@/lib/date-ranges";

export default async function CompliancePage() {
  const { from, to } = presetToRange("month");
  const rows = await getScheduledDrugRegister(from, to);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Compliance</h1>
      <ComplianceRegister initialRows={rows} />
    </div>
  );
}
