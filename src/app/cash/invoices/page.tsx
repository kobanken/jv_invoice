import { AppShell } from "@/components/AppShell";
import { InvoiceTable } from "@/components/InvoiceTable";
import { PageHeader } from "@/components/PageHeader";
import { cashInvoices } from "@/data/cash";

export default function CashInvoicesPage() {
  return (
    <AppShell>
      <PageHeader
        title="現金請求一覧"
        description="現金請求のみを対象月・締め日・請求書区分・発行/送付/集金状況で絞り込みます。"
      />
      <InvoiceTable title="現金請求一覧" invoices={cashInvoices} summaryPaymentType="cash" />
    </AppShell>
  );
}
