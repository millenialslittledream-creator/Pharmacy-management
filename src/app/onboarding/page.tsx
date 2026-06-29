import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function completeOnboarding(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.rpc("bootstrap_organization", {
    p_org_name: String(formData.get("org_name")),
    p_full_name: String(formData.get("full_name")),
  });
  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set up your pharmacy</CardTitle>
          <CardDescription>One last step before you can sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeOnboarding} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Pharmacy name</Label>
              <Input id="org_name" name="org_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Your name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
