"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOrgSettings } from "@/lib/actions/settings";

type OrgSettings = {
  name: string;
  gstin: string | null;
  address: string | null;
  phone: string | null;
  invoice_prefix: string;
  default_reorder_level: number;
  whatsapp_enabled: boolean;
  whatsapp_alert_number: string | null;
};

export function OrgSettingsForm({ initial }: { initial: OrgSettings }) {
  const [name, setName] = useState(initial.name);
  const [gstin, setGstin] = useState(initial.gstin ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoice_prefix);
  const [defaultReorderLevel, setDefaultReorderLevel] = useState(String(initial.default_reorder_level));
  const [whatsappEnabled, setWhatsappEnabled] = useState(initial.whatsapp_enabled);
  const [whatsappAlertNumber, setWhatsappAlertNumber] = useState(initial.whatsapp_alert_number ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateOrgSettings({
          name,
          gstin,
          address,
          phone,
          invoicePrefix,
          defaultReorderLevel: Number(defaultReorderLevel) || 0,
          whatsappEnabled,
          whatsappAlertNumber,
        });
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Business address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Business phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Invoice number prefix</Label>
            <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="INV" />
          </div>
          <div className="space-y-1.5">
            <Label>Default low-stock reorder level</Label>
            <Input
              type="number"
              value={defaultReorderLevel}
              onChange={(e) => setDefaultReorderLevel(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <input
              id="whatsapp-enabled"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
            />
            <Label htmlFor="whatsapp-enabled">Send WhatsApp invoice receipts &amp; low-stock alerts</Label>
          </div>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label>Alert number (for low-stock alerts)</Label>
            <Input
              value={whatsappAlertNumber}
              onChange={(e) => setWhatsappAlertNumber(e.target.value)}
              placeholder="91XXXXXXXXXX"
              disabled={!whatsappEnabled}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
