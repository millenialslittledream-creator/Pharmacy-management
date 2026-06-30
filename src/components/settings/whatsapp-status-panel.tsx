"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWhatsAppStatus, getWhatsAppQr, getWhatsAppLogs } from "@/lib/actions/whatsapp-admin";

type Status = { status: "connected" | "disconnected"; qrAvailable: boolean } | null;
type LogEntry = { time: string; message: string; extra?: unknown };

export function WhatsAppStatusPanel() {
  const [status, setStatus] = useState<Status>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const [statusResult, logsResult] = await Promise.all([getWhatsAppStatus(), getWhatsAppLogs()]);
      setStatus(statusResult);
      setLogs(logsResult);
      setChecked(true);

      if (statusResult?.status !== "connected") {
        const qrResult = await getWhatsAppQr();
        setQrDataUrl(qrResult?.qrDataUrl ?? null);
      } else {
        setQrDataUrl(null);
      }
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>WhatsApp connection</CardTitle>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isPending} className="gap-2">
          <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!checked ? (
          <p className="text-sm text-muted-foreground">Checking...</p>
        ) : !status ? (
          <p className="text-sm text-muted-foreground">
            WhatsApp service not configured (missing WHATSAPP_SERVICE_URL/SECRET env vars).
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={status.status === "connected" ? "secondary" : "destructive"}>
                {status.status}
              </Badge>
            </div>

            {status.status !== "connected" && qrDataUrl && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan with WhatsApp: Settings → Linked Devices → Link a Device.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="WhatsApp QR code" className="w-48 rounded-lg border" />
              </div>
            )}

            {status.status !== "connected" && !qrDataUrl && (
              <p className="text-sm text-muted-foreground">
                No QR available right now — click Refresh in a few seconds.
              </p>
            )}
          </>
        )}

        {logs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Recent activity</p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2 text-xs">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(log.time).toLocaleTimeString()}
                  </span>
                  <span>{log.message}</span>
                  {log.extra != null && (
                    <span className="text-muted-foreground">{JSON.stringify(log.extra)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
