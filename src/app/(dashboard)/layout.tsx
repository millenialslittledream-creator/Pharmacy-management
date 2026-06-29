import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organizations(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const orgName = (profile.organizations as unknown as { name: string } | null)?.name ?? "Pharmacy";
  const initial = profile.full_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="relative flex min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,oklch(0.4_0.1_178/8%),transparent_55%)] dark:bg-[radial-gradient(circle_at_15%_0%,oklch(0.78_0.13_178/10%),transparent_55%)] print:hidden"
      />
      <aside className="flex w-64 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-5 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-ambient">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {profile.full_name} &middot; {profile.role}
            </p>
          </div>
        </div>
        <SidebarNav role={profile.role} />
        <form action={logout} className="mt-auto">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 px-3.5 text-muted-foreground"
          >
            <LogOut strokeWidth={1.5} className="size-4" />
            Sign out
          </Button>
        </form>
      </aside>
      <main className="flex-1 p-6 lg:p-8 print:p-0">{children}</main>
    </div>
  );
}
