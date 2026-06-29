"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomers } from "@/lib/actions/customers";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 20;

type Customer = Awaited<ReturnType<typeof listCustomers>>["data"][number];

export function CustomersTable({
  initial,
  initialCount,
}: {
  initial: Customer[];
  initialCount: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>(initial);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const result = await listCustomers(query, page, PAGE_SIZE);
        setCustomers(result.data);
        setCount(result.count);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query, page]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name or phone..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Loyalty points</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No customers found.
              </TableCell>
            </TableRow>
          )}
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <Link href={`/customers/${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell className="text-right">{c.loyalty_points}</TableCell>
              <TableCell className="text-right">
                {c.outstanding_balance > 0 ? (
                  <Badge variant="destructive">{c.outstanding_balance.toFixed(2)}</Badge>
                ) : (
                  "0.00"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls page={page} pageSize={PAGE_SIZE} total={count} onPageChange={setPage} />
    </div>
  );
}
