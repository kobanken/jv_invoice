import { AppShell } from "@/components/AppShell";
import { CustomerTable } from "@/components/CustomerTable";
import { PageHeader } from "@/components/PageHeader";
import { cashCustomers } from "@/data/cash";

export default function CashCustomersPage() {
  return (
    <AppShell>
      <PageHeader
        title="現金顧客管理"
        description="現金顧客のみを表示します。将来は role/permission で表示自体を制御します。"
      />
      <CustomerTable customerType="cash" customers={cashCustomers} />
    </AppShell>
  );
}
