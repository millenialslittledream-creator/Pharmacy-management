import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["user_role"];
type IconName = "layout-dashboard" | "trending-up" | "package" | "receipt" | "users" | "user-cog";

export const NAV_ITEMS: { href: string; label: string; roles: Role[]; icon: IconName }[] = [
  { href: "/ceo", label: "CEO Dashboard", roles: ["ceo"], icon: "layout-dashboard" },
  { href: "/sales", label: "Sales Dashboard", roles: ["ceo", "pharmacist"], icon: "trending-up" },
  { href: "/inventory", label: "Inventory", roles: ["ceo", "pharmacist"], icon: "package" },
  { href: "/billing", label: "Billing", roles: ["ceo", "pharmacist", "staff"], icon: "receipt" },
  { href: "/customers", label: "Customers", roles: ["ceo", "pharmacist", "staff"], icon: "users" },
  { href: "/team", label: "Team", roles: ["ceo"], icon: "user-cog" },
];
