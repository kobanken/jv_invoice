"use client";

import { useMemo, useState } from "react";
import type { Customer, CustomerPrice, Product } from "@/types";
import { formatCurrencyJPY } from "@/lib/format";

export function PriceMasterTable({
  prices,
  customers,
  products,
}: {
  prices: CustomerPrice[];
  customers: Customer[];
  products: Product[];
}) {
  const [customerType, setCustomerType] = useState("");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return prices
      .map((price) => {
        const customer = customers.find((item) => item.customerId === price.customerId);
        const product = products.find((item) => item.productId === price.productId);
        return { price, customer, product };
      })
      .filter((row) => {
        const text = `${row.price.customerId} ${row.customer?.storeName ?? ""} ${row.product?.productName ?? ""}`.toLowerCase();
        return (!customerType || row.customer?.customerType === customerType) && text.includes(query.toLowerCase());
      });
  }, [customerType, customers, prices, products, query]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="顧客ID・店舗名・商品名で検索"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={customerType}
          onChange={(event) => setCustomerType(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">種別すべて</option>
          <option value="bank">振込</option>
          <option value="cash">現金</option>
        </select>
        <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
          表示件数: {rows.length}
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">顧客ID</th>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">店舗名</th>
              <th className="px-4 py-3">商品ID</th>
              <th className="px-4 py-3">商品名</th>
              <th className="px-4 py-3">単価</th>
              <th className="px-4 py-3">適用開始</th>
              <th className="px-4 py-3">適用終了</th>
              <th className="px-4 py-3">備考</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ price, customer, product }) => (
              <tr key={`${price.customerId}-${price.productId}-${price.validFromMonth}`}>
                <td className="px-4 py-3 font-semibold">{price.customerId}</td>
                <td className="px-4 py-3">{customer?.customerType === "cash" ? "現金" : "振込"}</td>
                <td className="px-4 py-3">{customer?.storeName ?? "-"}</td>
                <td className="px-4 py-3">{price.productId}</td>
                <td className="px-4 py-3">{product?.productName ?? "-"}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrencyJPY(price.unitPrice)}</td>
                <td className="px-4 py-3">{price.validFromMonth}</td>
                <td className="px-4 py-3">{price.validToMonth ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{price.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
