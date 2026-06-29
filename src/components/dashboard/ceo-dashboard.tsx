"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import {
  presetToRange,
  isSingleDayRange,
  formatHourLabel,
  type DateRangePreset,
} from "@/lib/date-ranges";
import { getRevenueByDay, getRevenueByHour, getTopSellingMedicines } from "@/lib/actions/dashboard";

type Alerts = { low_stock_count: number; expiring_soon_count: number; outstanding_total: number };
type RevenueRow = { bucket: string; total: number; order_count: number };
type TopMedicine = { medicine_id: string; name: string; qty_sold: number; revenue: number };

export function CeoDashboard({
  alerts,
  initialRevenue,
  initialTopMedicines,
}: {
  alerts: Alerts | null;
  initialRevenue: RevenueRow[];
  initialTopMedicines: TopMedicine[];
}) {
  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [revenue, setRevenue] = useState<RevenueRow[]>(initialRevenue);
  const [granularity, setGranularity] = useState<"day" | "hour">("day");
  const [topMedicines, setTopMedicines] = useState<TopMedicine[]>(initialTopMedicines);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { from, to } = presetToRange(preset, customFrom, customTo);
    const singleDay = isSingleDayRange(preset, customFrom, customTo);
    startTransition(async () => {
      const [rev, top] = await Promise.all([
        singleDay ? getRevenueByHour(from, to) : getRevenueByDay(from, to),
        getTopSellingMedicines(from, to, 10),
      ]);
      setGranularity(singleDay ? "hour" : "day");
      setRevenue(rev.map((r) => ({ bucket: "hour" in r ? r.hour : r.day, total: r.total, order_count: r.order_count })));
      setTopMedicines(top);
    });
  }, [preset, customFrom, customTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="mb-1 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Overview
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">CEO Dashboard</h1>
        </div>
        <DateRangePicker
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={setPreset}
          onCustomChange={(f, t) => {
            setCustomFrom(f);
            setCustomTo(t);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Revenue (range)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {revenue.reduce((s, r) => s + r.total, 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Orders (range)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {revenue.reduce((s, r) => s + Number(r.order_count), 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {alerts ? (
              <Badge variant={alerts.low_stock_count > 0 ? "destructive" : "secondary"}>
                {alerts.low_stock_count}
              </Badge>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Expiring soon (90d)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {alerts ? (
              <Badge variant={alerts.expiring_soon_count > 0 ? "destructive" : "secondary"}>
                {alerts.expiring_soon_count}
              </Badge>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn("transition-opacity duration-300 ease-premium", isPending && "opacity-60")}>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
                tickFormatter={granularity === "hour" ? formatHourLabel : undefined}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                labelFormatter={granularity === "hour" ? (label) => formatHourLabel(String(label)) : undefined}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  boxShadow: "var(--shadow-ambient)",
                }}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top-selling medicines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Qty sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMedicines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No sales in this range.
                    </TableCell>
                  </TableRow>
                )}
                {topMedicines.map((m) => (
                  <TableRow key={m.medicine_id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-right">{m.qty_sold}</TableCell>
                    <TableCell className="text-right">{m.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total outstanding customer balance</p>
            <p className="text-3xl font-semibold tracking-tight">{alerts?.outstanding_total.toFixed(2) ?? "—"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
