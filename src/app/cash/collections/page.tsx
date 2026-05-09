import { AppShell } from "@/components/AppShell";
import { CashCollectionPanel } from "@/components/CashCollectionPanel";
import { PageHeader } from "@/components/PageHeader";
import { cashCollectionRecords, cashCustomers, cashInvoices } from "@/data/cash";

export default function CashCollectionsPage() {
  return (
    <AppShell>
      <PageHeader
        title="現金集金確認"
        description="現金顧客の請求金額、集金額、差額、集金担当、状況を確認します。"
      />
      <CashCollectionPanel customers={cashCustomers} invoices={cashInvoices} records={cashCollectionRecords} />
    </AppShell>
  );
}
