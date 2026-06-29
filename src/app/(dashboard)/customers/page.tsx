import { listCustomers } from "@/lib/actions/customers";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { CustomersTable } from "@/components/customers/customers-table";

export default async function CustomersPage() {
  const { data: customers, count } = await listCustomers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
        <AddCustomerDialog />
      </div>
      <CustomersTable initial={customers} initialCount={count} />
    </div>
  );
}
