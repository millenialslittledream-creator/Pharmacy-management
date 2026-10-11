import { listTeamMembers, listPendingInvites } from "@/lib/actions/team";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteTeamDialog } from "@/components/team/invite-team-dialog";
import { AddTeammateDialog } from "@/components/team/add-teammate-dialog";
import { ResetPasswordDialog } from "@/components/team/reset-password-dialog";
import { PendingInvites } from "@/components/team/pending-invites";
import { formatLastActive, getPresence } from "@/lib/presence";

const STATUS_LABEL = {
  online: "Active now",
  today: "Active today",
  inactive: "Inactive",
  never: "Never signed in",
} as const;

const STATUS_DOT = {
  online: "bg-emerald-500",
  today: "bg-amber-500",
  inactive: "bg-muted-foreground/40",
  never: "bg-muted-foreground/40",
} as const;

export default async function TeamPage() {
  const [rawMembers, invites] = await Promise.all([listTeamMembers(), listPendingInvites()]);
  const members = rawMembers.map((m) => ({
    ...m,
    presence: getPresence(m.last_seen_at, m.last_sign_in_at),
  }));
  const activeNow = members.filter((m) => m.presence.status === "online").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <div className="flex gap-2">
          <AddTeammateDialog />
          <InviteTeamDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Members <span className="ml-2 text-sm font-normal text-muted-foreground">{activeNow} of {members.length} active now</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Login email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "ceo" ? "default" : "secondary"} className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${STATUS_DOT[m.presence.status]}`} />
                      <div className="leading-tight">
                        <p className="text-sm">{STATUS_LABEL[m.presence.status]}</p>
                        {m.presence.lastActive && (
                          <p className="text-xs text-muted-foreground">
                            {formatLastActive(m.presence.lastActive)}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {m.role !== "ceo" && <ResetPasswordDialog profileId={m.id} name={m.full_name} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingInvites invites={invites} />
        </CardContent>
      </Card>
    </div>
  );
}
