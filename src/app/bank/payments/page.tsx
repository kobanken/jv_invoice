import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PaymentMatchingPanel } from "@/components/PaymentMatchingPanel";
import { bankCustomers, bankInvoices } from "@/data/bank";

export default function BankPaymentsPage() {
  return (
    <AppShell>
      <PageHeader
        title="振込入金確認"
        description="CSVを使わず、手入力した入金日・名義・金額から候補顧客と候補請求を表示します。"
      />
      <PaymentMatchingPanel customers={bankCustomers} invoices={bankInvoices} />
    </AppShell>
  );
}
