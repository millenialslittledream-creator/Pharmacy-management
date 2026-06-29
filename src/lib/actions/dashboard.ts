"use server";

import { unstable_cache } from "next/cache";
import { requireOrgId } from "@/lib/actions/require-org";

const REVALIDATE_SECONDS = 60;

export async function getRevenueByDay(from: string, to: string) {
  const { supabase, orgId } = await requireOrgId();
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("revenue_by_day", { p_from: from, p_to: to });
      if (error) throw error;
      return data;
    },
    ["revenue-by-day", orgId, from, to],
    { revalidate: REVALIDATE_SECONDS, tags: [`dashboard-${orgId}`] },
  );
  return cached();
}

export async function getRevenueByHour(from: string, to: string) {
  const { supabase, orgId } = await requireOrgId();
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("revenue_by_hour", { p_from: from, p_to: to });
      if (error) throw error;
      return data;
    },
    ["revenue-by-hour", orgId, from, to],
    { revalidate: REVALIDATE_SECONDS, tags: [`dashboard-${orgId}`] },
  );
  return cached();
}

export async function getTopSellingMedicines(from: string, to: string, limit = 10) {
  const { supabase, orgId } = await requireOrgId();
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("top_selling_medicines", {
        p_from: from,
        p_to: to,
        p_limit: limit,
      });
      if (error) throw error;
      return data;
    },
    ["top-selling-medicines", orgId, from, to, String(limit)],
    { revalidate: REVALIDATE_SECONDS, tags: [`dashboard-${orgId}`] },
  );
  return cached();
}

export async function getSalesSummary(from: string, to: string) {
  const { supabase, orgId } = await requireOrgId();
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("sales_summary", { p_from: from, p_to: to });
      if (error) throw error;
      return data[0];
    },
    ["sales-summary", orgId, from, to],
    { revalidate: REVALIDATE_SECONDS, tags: [`dashboard-${orgId}`] },
  );
  return cached();
}

export async function getDashboardAlerts() {
  const { supabase, orgId } = await requireOrgId();
  const cached = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("dashboard_alerts");
      if (error) throw error;
      return data[0];
    },
    ["dashboard-alerts", orgId],
    { revalidate: REVALIDATE_SECONDS, tags: [`dashboard-${orgId}`] },
  );
  return cached();
}
