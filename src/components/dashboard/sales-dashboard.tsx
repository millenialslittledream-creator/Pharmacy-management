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
import {
  presetToRange,
  isSingleDayRange,
  formatHourLabel,
  type DateRangePreset,
} from "@/lib/date-ranges";
import {
  getRevenueByDay,
  getRevenueByHour,
  getSalesByMember,
  getSalesSummary,
} from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
type RevenueRow = { bucket: string; total: number; order_count: number };
type MemberRow = {
  member_id: string;
  full_name: string;
  role: string;
  order_count: number;
  total_revenue: number;
  avg_bill_value: number;
  returns_count: number;
  pending_amount: number;
};

export function SalesDashboard({
  initialSummary,
  initialRevenue,
  initialGranularity,
  initialMembers,
  isCeo,
}: {
  initialSummary: Summary | null;
  initialRevenue: RevenueRow[];
  initialGranularity: "day" | "hour";
  initialMembers: MemberRow[];
  isCeo: boolean;
}) {
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [revenue, setRevenue] = useState<RevenueRow[]>(initialRevenue);
  const [granularity, setGranularity] = useState<"day" | "hour">(initialGranularity);
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
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
      const [s, rev, m] = await Promise.all([
        getSalesSummary(from, to),
        singleDay ? getRevenueByHour(from, to) : getRevenueByDay(from, to),
        getSalesByMember(from, to),
      ]);
      setSummary(s ?? null);
      setMembers(m);
      setGranularity(singleDay ? "hour" : "day");
      setRevenue(rev.map((r) => ({ bucket: "hour" in r ? r.hour : r.day, total: r.total, order_count: r.order_count })));
    });
  }, [preset, customFrom, customTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="mb-1 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Operations
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isCeo ? "Sales Dashboard" : "My Sales"}
          </h1>
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

      {isCeo && (
        <Card className={cn("transition-opacity duration-300 ease-premium", isPending && "opacity-60")}>
          <CardHeader>
            <CardTitle>Sales by team member</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Avg bill</TableHead>
                  <TableHead className="text-right">Returns</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.member_id}>
                    <TableCell className="font-medium">{m.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === "ceo" ? "default" : "secondary"} className="capitalize">
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.order_count}</TableCell>
                    <TableCell className="text-right">{m.total_revenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{m.avg_bill_value.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{m.returns_count}</TableCell>
                    <TableCell className="text-right">{m.pending_amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
