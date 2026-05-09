import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProductMasterTable } from "@/components/ProductMasterTable";
import { products } from "@/data/products";

export default function ProductMasterPage() {
  return (
    <AppShell>
      <PageHeader
        title="商品マスタ"
        description="通常商品、送料、紙請求書発行手数料などを商品として一元管理します。"
      />
      <ProductMasterTable products={products} />
    </AppShell>
  );
}
