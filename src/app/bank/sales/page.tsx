import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SalesEntryForm } from "@/components/SalesEntryForm";
import { bankCustomerPrices, bankCustomers, bankSalesDetails } from "@/data/bank";
import { products } from "@/data/products";

export default function BankSalesPage() {
  return (
    <AppShell>
      <PageHeader
        title="振込個別売上調整"
        description="通常の横型納品入力とは別に、振込顧客の個別明細や調整明細を追加します。"
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
