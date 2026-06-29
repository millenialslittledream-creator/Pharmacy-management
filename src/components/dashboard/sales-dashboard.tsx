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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { presetToRange, type DateRangePreset } from "@/lib/date-ranges";
import { getRevenueByDay, getSalesSummary } from "@/lib/actions/dashboard";

type Summary = {
  total_revenue: number;
  order_count: number;
  avg_bill_value: number;
  returns_count: number;
  cash_total: number;
  card_total: number;
  upi_total: number;
  credit_total: number;
};
type RevenueRow = { day: string; total: number; order_count: number };

export function SalesDashboard({
  initialSummary,
  initialRevenue,
}: {
  initialSummary: Summary | null;
  initialRevenue: RevenueRow[];
}) {
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [revenue, setRevenue] = useState<RevenueRow[]>(initialRevenue);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const { from, to } = presetToRange(preset, customFrom, customTo);
    startTransition(async () => {
      const [s, rev] = await Promise.all([getSalesSummary(from, to), getRevenueByDay(from, to)]);
      setSummary(s ?? null);
      setRevenue(rev);
    });
  }, [preset, customFrom, customTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="mb-1 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Operations
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Sales Dashboard</h1>
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
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">Sales</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {(summary?.total_revenue ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">Bills</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{summary?.order_count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Avg bill value
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            {(summary?.avg_bill_value ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">Returns</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">{summary?.returns_count ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cn("transition-opacity duration-300 ease-premium", isPending && "opacity-60")}>
          <CardHeader>
            <CardTitle>Sales trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
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

        <Card>
          <CardHeader>
            <CardTitle>Payment mode breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cash</span>
              <span>{(summary?.cash_total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card</span>
              <span>{(summary?.card_total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI</span>
              <span>{(summary?.upi_total ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credit</span>
              <span>{(summary?.credit_total ?? 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
