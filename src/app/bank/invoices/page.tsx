import { AppShell } from "@/components/AppShell";
import { InvoiceTable } from "@/components/InvoiceTable";
import { PageHeader } from "@/components/PageHeader";
import { bankInvoices } from "@/data/bank";

export default function BankInvoicesPage() {
  return (
    <AppShell>
      <PageHeader
        title="振込請求一覧"
        description="振込請求のみを対象月・締め日・請求書区分・発行/送付/入金状況で絞り込みます。"
      />
      <InvoiceTable title="振込請求一覧" invoices={bankInvoices} summaryPaymentType="bank_transfer" />
    </AppShell>
  );
}
