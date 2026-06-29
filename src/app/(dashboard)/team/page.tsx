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
import { PendingInvites } from "@/components/team/pending-invites";

export default async function TeamPage() {
  const [members, invites] = await Promise.all([listTeamMembers(), listPendingInvites()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <InviteTeamDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "ceo" ? "default" : "secondary"} className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
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
