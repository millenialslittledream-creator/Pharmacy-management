import { getOrgSettings } from "@/lib/actions/settings";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";

export default async function SettingsPage() {
  const settings = await getOrgSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <OrgSettingsForm initial={settings} />
    </div>
  );
}
