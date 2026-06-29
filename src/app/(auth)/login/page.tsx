import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="bezel-shell">
      <Card className="bezel-core shadow-ambient-lg ring-0">
        <CardHeader>
          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Pharrmasy
          </span>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Welcome back to your pharmacy workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full">Sign in</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
