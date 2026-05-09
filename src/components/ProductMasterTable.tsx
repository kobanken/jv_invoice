import type { Product } from "@/types";

export function ProductMasterTable({ products }: { products: Product[] }) {
  return (
    <div className="table-scroll">
      <table className="min-w-[920px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-4 py-3">商品ID</th>
            <th className="px-4 py-3">商品名</th>
            <th className="px-4 py-3">表示順</th>
            <th className="px-4 py-3">通常商品</th>
            <th className="px-4 py-3">手数料/送料系</th>
            <th className="px-4 py-3">有効</th>
            <th className="px-4 py-3">備考</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((product) => (
              <tr key={product.productId}>
                <td className="px-4 py-3 font-semibold">{product.productId}</td>
                <td className="px-4 py-3">{product.productName}</td>
                <td className="px-4 py-3">{product.displayOrder}</td>
                <td className="px-4 py-3">{product.isRegularProduct ? "はい" : "いいえ"}</td>
                <td className="px-4 py-3">{product.isFee ? "はい" : "いいえ"}</td>
                <td className="px-4 py-3">{product.isActive ? "有効" : "無効"}</td>
                <td className="px-4 py-3 text-slate-600">{product.notes}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
