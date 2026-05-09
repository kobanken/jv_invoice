import { AppShell } from "@/components/AppShell";
import { InvoicePreview } from "@/components/InvoicePreview";
import { PageHeader } from "@/components/PageHeader";
import { bankCustomers, bankSalesDetails } from "@/data/bank";
import { cashCustomers, cashSalesDetails } from "@/data/cash";

export default function InvoicePreviewPage() {
  return (
    <AppShell>
      <PageHeader
        title="請求書プレビュー"
        description="請求書テンプレートは1つに固定し、顧客ID・対象月・締め日で明細を切り替えます。"
      />
      <InvoicePreview
        customers={[...bankCustomers, ...cashCustomers]}
        salesDetails={[...bankSalesDetails, ...cashSalesDetails]}
      />
    </AppShell>
  );
}
