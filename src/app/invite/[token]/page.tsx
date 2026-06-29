import { getInviteByToken } from "@/lib/actions/team";
import { acceptInviteSignup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getInviteByToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        {!invite ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite not found</CardTitle>
              <CardDescription>This invite link is invalid.</CardDescription>
            </CardHeader>
          </Card>
        ) : invite.accepted ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite already used</CardTitle>
              <CardDescription>This invite has already been accepted. Sign in instead.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Join {invite.org_name}</CardTitle>
              <CardDescription>
                You have been invited as <span className="capitalize">{invite.role}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={acceptInviteSignup} className="space-y-4">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="email" value={invite.email} />
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={invite.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Your name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">
                  Accept invite &amp; join
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
