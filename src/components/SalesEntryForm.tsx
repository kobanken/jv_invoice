"use client";

import { useMemo, useState } from "react";
import type { ClosingDay, Customer, CustomerPrice, CustomerType, Product, SalesDetail } from "@/types";
import { calculateSalesAmount } from "@/lib/invoices";
import { getCustomerPrice } from "@/lib/prices";
import { formatClosingDay, formatCurrencyJPY } from "@/lib/format";

type Props = {
  customerType: CustomerType;
  customers: Customer[];
  products: Product[];
  prices: CustomerPrice[];
  initialSalesDetails: SalesDetail[];
};

export function SalesEntryForm({
  customerType,
  customers,
  products,
  prices,
  initialSalesDetails,
}: Props) {
  const [customerId, setCustomerId] = useState(customers[0]?.customerId ?? "");
  const [productId, setProductId] = useState(products[0]?.productId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [targetMonth, setTargetMonth] = useState("2026-05");
  const [deliveryDate, setDeliveryDate] = useState("2026-05-31");
  const [closingDay, setClosingDay] = useState<string>(String(customers[0]?.closingDay ?? "endOfMonth"));
  const [details, setDetails] = useState<SalesDetail[]>(initialSalesDetails);

  const selectedCustomer = customers.find((customer) => customer.customerId === customerId);
  const selectedProduct = products.find((product) => product.productId === productId);
  const selectedPrice = getCustomerPrice(prices, customerId, productId, targetMonth);
  const unitPrice = selectedPrice?.unitPrice ?? 0;
  const amount = calculateSalesAmount(unitPrice, quantity);

  const visibleDetails = useMemo(() => {
    return details.filter((detail) => detail.customerType === customerType && detail.targetMonth === targetMonth);
  }, [customerType, details, targetMonth]);

  function addDetail() {
    if (!selectedCustomer || !selectedProduct || !selectedPrice) return;
    const now = new Date().toISOString().slice(0, 10);
    const nextDetail: SalesDetail = {
      salesId: `${customerType === "bank" ? "SB" : "SC"}-${Date.now()}`,
      customerId,
      customerType,
      deliveryDate,
      productId,
      productName: selectedProduct.productName,
      unitPrice,
      quantity,
      amount,
      targetMonth,
      closingDay: parseClosingDay(closingDay),
      notes: "画面上のモック追加",
      createdAt: now,
      updatedAt: now,
    };
    setDetails((current) => [nextDetail, ...current]);
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const nextCustomer = customers.find((customer) => customer.customerId === nextCustomerId);
    if (nextCustomer) setClosingDay(String(nextCustomer.closingDay));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="surface p-5">
        <h3 className="text-base font-bold">売上明細入力</h3>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">
            顧客
            <select
              value={customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
              className="field mt-1 w-full font-normal"
            >
              {customers.map((customer) => (
                <option key={customer.customerId} value={customer.customerId}>
                  {customer.customerId} {customer.storeName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              対象月
              <input
                type="month"
                value={targetMonth}
                onChange={(event) => setTargetMonth(event.target.value)}
                className="field mt-1 w-full font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              納品日
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="field mt-1 w-full font-normal"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            締め日
            <select
              value={closingDay}
              onChange={(event) => setClosingDay(event.target.value)}
              className="field mt-1 w-full font-normal"
            >
              <option value="15">15日締め</option>
              <option value="20">20日締め</option>
              <option value="endOfMonth">月末締め</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            商品
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="field mt-1 w-full font-normal"
            >
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.productName}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold">
              単価
              <input
                value={selectedPrice ? formatCurrencyJPY(unitPrice) : "未設定"}
                readOnly
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              数量
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="field mt-1 w-full font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              金額
              <input
                value={formatCurrencyJPY(amount)}
                readOnly
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
              />
            </label>
          </div>
          {!selectedPrice ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              この顧客・商品・対象月の単価が単価マスタにありません。
            </p>
          ) : null}
          <button
            type="button"
            onClick={addDetail}
            disabled={!selectedPrice}
            className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            明細に追加
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">納品日</th>
              <th className="px-4 py-3">顧客ID</th>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">締め日</th>
              <th className="px-4 py-3">単価</th>
              <th className="px-4 py-3">数量</th>
              <th className="px-4 py-3">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleDetails.map((detail) => (
              <tr key={detail.salesId}>
                <td className="px-4 py-3">{detail.deliveryDate}</td>
                <td className="px-4 py-3 font-semibold">{detail.customerId}</td>
                <td className="px-4 py-3">{detail.productName}</td>
                <td className="px-4 py-3">{formatClosingDay(detail.closingDay)}</td>
                <td className="px-4 py-3">{formatCurrencyJPY(detail.unitPrice)}</td>
                <td className="px-4 py-3">{detail.quantity}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrencyJPY(detail.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function parseClosingDay(value: string): ClosingDay {
  if (value === "15") return 15;
  if (value === "20") return 20;
  return "endOfMonth";
}
