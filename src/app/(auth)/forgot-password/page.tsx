import Link from "next/link";
import { requestPasswordReset, resetPasswordWithOtp } from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string; error?: string }>;
}) {
  const { step, email, error } = await searchParams;
  const verifying = step === "verify" && email;

  return (
    <div className="bezel-shell">
      <Card className="bezel-core shadow-ambient-lg ring-0">
        <CardHeader>
          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            Pharmacy
          </span>
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            {verifying
              ? `If ${email} is a CEO account, we've sent it a 6-digit code. Enter it below with your new password.`
              : "Enter the owner (CEO) email. We'll send a 6-digit code to it. Team members: ask your CEO to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verifying ? (
            <form action={resetPasswordWithOtp} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <div className="space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full">Set new password</Button>
            </form>
          ) : (
            <form action={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full">Send code</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
