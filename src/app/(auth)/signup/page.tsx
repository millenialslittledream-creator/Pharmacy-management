import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="bezel-shell">
      <Card className="bezel-core shadow-ambient-lg ring-0">
        <CardHeader>
          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Pharrmasy
          </span>
          <CardTitle className="text-xl">Create your pharmacy</CardTitle>
          <CardDescription>You will be set up as the CEO/owner of this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Pharmacy name</Label>
              <Input id="org_name" name="org_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Your name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full">Create pharmacy</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
