"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type { ClosingDay, Customer, CustomerPrice, CustomerType, Product, SalesDetail } from "@/types";
import { useLiveCustomers } from "@/lib/api/customers";
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
  const { customers: liveCustomers, loading: customersLoading, error: customersError } = useLiveCustomers(customerType, customers);
  const [customerId, setCustomerId] = useState(customers[0]?.customerId ?? "");
  const [productId, setProductId] = useState(products[0]?.productId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [targetMonth, setTargetMonth] = useState("2026-05");
  const [deliveryDay, setDeliveryDay] = useState("31");
  const [closingDay, setClosingDay] = useState<string>(String(customers[0]?.closingDay ?? "endOfMonth"));
  const [details, setDetails] = useState<SalesDetail[]>(initialSalesDetails);
  const [hasLoadedSavedDetails, setHasLoadedSavedDetails] = useState(false);
  const storageKey = `jv-invoice:${customerType}:sales-details`;

  useEffect(() => {
    const firstCustomer = liveCustomers[0];
    if (!firstCustomer) {
      setCustomerId("");
      return;
    }
    if (!customerId || !liveCustomers.some((customer) => customer.customerId === customerId)) {
      setCustomerId(firstCustomer.customerId);
      setClosingDay(String(firstCustomer.closingDay));
    }
  }, [customerId, liveCustomers]);

  useEffect(() => {
    try {
      const savedDetails = window.localStorage.getItem(storageKey);
      if (!savedDetails) return;
      const parsedDetails = JSON.parse(savedDetails) as SalesDetail[];
      if (Array.isArray(parsedDetails)) {
        setDetails(parsedDetails);
      }
    } catch {
      setDetails(initialSalesDetails);
    } finally {
      setHasLoadedSavedDetails(true);
    }
  }, [initialSalesDetails, storageKey]);

  useEffect(() => {
    if (!hasLoadedSavedDetails) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(details));
    } catch {
      // ローカル保存に失敗しても、画面上の入力は維持します。
    }
  }, [details, hasLoadedSavedDetails, storageKey]);

  const selectedCustomer = liveCustomers.find((customer) => customer.customerId === customerId);
  const customerOptions = useMemo<CustomerSearchOption<string>[]>(() => {
    return liveCustomers.map((customer) => ({
      value: customer.customerId,
      label: `${customer.customerId} ${customer.storeName}`,
      keywords: `${customer.billingName} ${customer.storeName} ${customer.email} ${customer.notes}`,
    }));
  }, [liveCustomers]);
  const selectedProduct = products.find((product) => product.productId === productId);
  const selectedPrice = getCustomerPrice(prices, customerId, productId, targetMonth);
  const unitPrice = selectedPrice?.unitPrice ?? 0;
  const amount = calculateSalesAmount(unitPrice, quantity);
  const deliveryDate = formatDeliveryDateFromDay(targetMonth, deliveryDay);

  const visibleDetails = useMemo(() => {
    return details.filter((detail) => detail.customerType === customerType && detail.targetMonth === targetMonth);
  }, [customerType, details, targetMonth]);

  function addDetail() {
    if (!selectedCustomer || !selectedProduct || !selectedPrice || !deliveryDay) return;
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
      notes: "画面上の追加",
      createdAt: now,
      updatedAt: now,
    };
    setDetails((current) => [nextDetail, ...current]);
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const nextCustomer = liveCustomers.find((customer) => customer.customerId === nextCustomerId);
    if (nextCustomer) setClosingDay(String(nextCustomer.closingDay));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="surface p-5">
        <h3 className="text-base font-bold">売上明細入力</h3>
        <div className="mt-4 space-y-4">
          <CustomerSearchField
            label="顧客"
            value={customerId}
            options={customerOptions}
            onChange={handleCustomerChange}
          />
          {customersLoading ? <p className="text-xs text-slate-500">顧客マスタを読み込み中です。</p> : null}
          {customersError ? <p className="text-xs text-amber-700">顧客マスタを取得できないため、既存データで表示しています。</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              対象月
              <input
                type="month"
                value={targetMonth}
                onChange={(event) => {
                  setTargetMonth(event.target.value);
                  setDeliveryDay((current) => normalizeDayInput(current, event.target.value));
                }}
                className="field mt-1 w-full font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              納品日
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="日"
                value={deliveryDay}
                onChange={(event) => setDeliveryDay(normalizeDayInput(event.target.value, targetMonth))}
                className="field mt-1 w-full text-right font-normal"
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
            disabled={!selectedPrice || !deliveryDay}
            className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            明細に追加
          </button>
          <button
            type="button"
            onClick={() => setDetails(initialSalesDetails)}
            className="w-full rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            入力保存を初期データに戻す
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

function normalizeDayInput(value: string, targetMonth: string) {
  const numericValue = value.replace(/\D/g, "");
  if (!numericValue) return "";
  const day = Number(numericValue);
  if (day < 1) return "";
  return String(Math.min(day, getDaysInMonth(targetMonth)));
}

function getDaysInMonth(targetMonth: string) {
  const [year, month] = targetMonth.split("-").map(Number);
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function formatDeliveryDateFromDay(targetMonth: string, day: string) {
  if (!day) return "";
  return `${targetMonth}-${day.padStart(2, "0")}`;
}
