"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeInvite } from "@/lib/actions/team";
import type { listPendingInvites } from "@/lib/actions/team";

type Invite = Awaited<ReturnType<typeof listPendingInvites>>[number];

export function PendingInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function copyLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeInvite(id);
      toast.success("Invite revoked");
      router.refresh();
    });
  }

  if (invites.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending invites.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell>{invite.email}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {invite.role}
              </Badge>
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => copyLink(invite.token)}>
                Copy link
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleRevoke(invite.id)}>
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
