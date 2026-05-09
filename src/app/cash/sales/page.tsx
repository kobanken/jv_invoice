import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SalesEntryForm } from "@/components/SalesEntryForm";
import { cashCustomerPrices, cashCustomers, cashSalesDetails } from "@/data/cash";
import { products } from "@/data/products";

export default function CashSalesPage() {
  return (
    <AppShell>
      <PageHeader
        title="現金売上入力"
        description="現金顧客だけを対象に、振込側とは別データを参照して明細を作成します。"
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
