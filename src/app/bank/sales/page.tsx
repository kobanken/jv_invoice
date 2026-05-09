import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SalesEntryForm } from "@/components/SalesEntryForm";
import { bankCustomerPrices, bankCustomers, bankSalesDetails } from "@/data/bank";
import { products } from "@/data/products";

export default function BankSalesPage() {
  return (
    <AppShell>
      <PageHeader
        title="振込売上入力"
        description="振込顧客だけを対象に、顧客別単価マスタから単価を自動反映して明細を作成します。"
      />
      <SalesEntryForm
        customerType="bank"
        customers={bankCustomers}
        products={products}
        prices={bankCustomerPrices}
        initialSalesDetails={bankSalesDetails}
      />
    </AppShell>
  );
}
