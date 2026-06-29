"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Receipt,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import type { Database } from "@/lib/supabase/types";

type Role = Database["public"]["Enums"]["user_role"];

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "trending-up": TrendingUp,
  package: Package,
  receipt: Receipt,
  users: Users,
  "user-cog": UserCog,
};

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ease-premium",
              active
                ? "bg-primary text-primary-foreground shadow-ambient"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            <Icon
              strokeWidth={1.5}
              className={cn(
                "size-4 shrink-0 transition-transform duration-200 ease-premium",
                active ? "" : "group-hover:translate-x-0.5",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
