import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PriceMasterTable } from "@/components/PriceMasterTable";
import { bankCustomerPrices, bankCustomers } from "@/data/bank";
import { cashCustomerPrices, cashCustomers } from "@/data/cash";
import { products } from "@/data/products";

export default function PriceMasterPage() {
  return (
    <AppShell>
      <PageHeader
        title="単価マスタ"
        description="顧客ごと・商品ごとの単価と適用月を管理します。納品入力や個別売上調整時の単価自動反映に使います。"
      />
      <PriceMasterTable
        prices={[...bankCustomerPrices, ...cashCustomerPrices]}
        customers={[...bankCustomers, ...cashCustomers]}
        products={products}
      />
    </AppShell>
  );
}
