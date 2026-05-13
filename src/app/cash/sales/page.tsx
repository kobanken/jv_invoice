import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SalesEntryForm } from "@/components/SalesEntryForm";
import { cashCustomerPrices, cashCustomers, cashSalesDetails } from "@/data/cash";
import { products } from "@/data/products";

export default function CashSalesPage() {
  return (
    <AppShell>
      <PageHeader
        title="現金個別売上調整"
        description="通常の横型納品入力とは別に、現金顧客の個別明細や調整明細を追加します。"
      />
      <SalesEntryForm
        customerType="cash"
        customers={cashCustomers}
        products={products}
        prices={cashCustomerPrices}
        initialSalesDetails={cashSalesDetails}
      />
    </AppShell>
  );
}
