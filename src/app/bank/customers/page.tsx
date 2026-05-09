import { AppShell } from "@/components/AppShell";
import { CustomerTable } from "@/components/CustomerTable";
import { PageHeader } from "@/components/PageHeader";
import { bankCustomers } from "@/data/bank";

export default function BankCustomersPage() {
  return (
    <AppShell>
      <PageHeader
        title="振込顧客管理"
        description="振込顧客のみを表示します。現金顧客データは参照しません。"
      />
      <CustomerTable customerType="bank" customers={bankCustomers} />
    </AppShell>
  );
}
