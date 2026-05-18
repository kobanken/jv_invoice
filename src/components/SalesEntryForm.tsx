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
  entryTarget?: "customer" | "store";
};

export function SalesEntryForm({
  customerType,
  customers,
  products,
  prices,
  initialSalesDetails,
  entryTarget = "customer",
}: Props) {
  const { customers: liveCustomers, loading: customersLoading, error: customersError } = useLiveCustomers(customerType, customers);
  const usesStoreInput = entryTarget === "store";
  const [customerId, setCustomerId] = useState(() => usesStoreInput ? "" : customers[0]?.customerId ?? "");
  const [storeName, setStoreName] = useState("");
  const [productId, setProductId] = useState(products[0]?.productId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [targetMonth, setTargetMonth] = useState(() => getCurrentMonth());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [closingDay, setClosingDay] = useState<string>(String(usesStoreInput ? "endOfMonth" : customers[0]?.closingDay ?? "endOfMonth"));
  const [manualUnitPrice, setManualUnitPrice] = useState(0);
  const [details, setDetails] = useState<SalesDetail[]>(initialSalesDetails);
  const [hasLoadedSavedDetails, setHasLoadedSavedDetails] = useState(false);
  const storageKey = `jv-invoice:${customerType}:sales-details`;

  useEffect(() => {
    if (usesStoreInput) return;
    const firstCustomer = liveCustomers[0];
    if (!firstCustomer) {
      setCustomerId("");
      return;
    }
    if (!customerId || !liveCustomers.some((customer) => customer.customerId === customerId)) {
      setCustomerId(firstCustomer.customerId);
      setClosingDay(String(firstCustomer.closingDay));
    }
  }, [customerId, liveCustomers, usesStoreInput]);

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
  const selectedPrice = usesStoreInput ? undefined : getCustomerPrice(prices, customerId, productId, targetMonth);
  const unitPrice = usesStoreInput ? manualUnitPrice : selectedPrice?.unitPrice ?? 0;
  const amount = calculateSalesAmount(unitPrice, quantity);
  const canAddDetail = Boolean(
    selectedProduct &&
    deliveryDate &&
    quantity > 0 &&
    (usesStoreInput ? storeName.trim() : selectedCustomer && selectedPrice),
  );

  const visibleDetails = useMemo(() => {
    return details.filter((detail) => detail.customerType === customerType && detail.targetMonth === targetMonth);
  }, [customerType, details, targetMonth]);

  function addDetail() {
    if (!canAddDetail || !selectedProduct) return;
    const now = new Date().toISOString().slice(0, 10);
    const nextDetail: SalesDetail = {
      salesId: `${customerType === "bank" ? "SB" : "SC"}-${Date.now()}`,
      customerId: usesStoreInput ? "" : customerId,
      storeName: usesStoreInput ? storeName.trim() : selectedCustomer?.storeName,
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

  function handleTargetMonthChange(nextTargetMonth: string) {
    setTargetMonth(nextTargetMonth);
    setDeliveryDate((current) => moveDateToMonth(current, nextTargetMonth));
  }

  function handleDeliveryDateChange(nextDeliveryDate: string) {
    setDeliveryDate(nextDeliveryDate);
    if (nextDeliveryDate) setTargetMonth(nextDeliveryDate.slice(0, 7));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="surface p-5">
        <h3 className="text-base font-bold">売上明細入力</h3>
        <div className="mt-4 space-y-4">
          {usesStoreInput ? (
            <label className="block text-sm font-semibold">
              店舗
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="店舗名を入力"
                className="field mt-1 w-full font-normal"
              />
            </label>
          ) : (
            <>
              <CustomerSearchField
                label="顧客"
                value={customerId}
                options={customerOptions}
                onChange={handleCustomerChange}
              />
              {customersLoading ? <p className="text-xs text-slate-500">顧客マスタを読み込み中です。</p> : null}
              {customersError ? <p className="text-xs text-amber-700">顧客マスタを取得できないため、既存データで表示しています。</p> : null}
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              対象月
              <input
                type="month"
                value={targetMonth}
                onChange={(event) => handleTargetMonthChange(event.target.value)}
                className="field mt-1 w-full font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              納品日
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => handleDeliveryDateChange(event.target.value)}
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
              <option value="10">10日締め</option>
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
              {usesStoreInput ? (
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={manualUnitPrice}
                  onChange={(event) => setManualUnitPrice(Number(event.target.value))}
                  className="field mt-1 w-full font-normal"
                />
              ) : (
                <input
                  value={selectedPrice ? formatCurrencyJPY(unitPrice) : "未設定"}
                  readOnly
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
                />
              )}
            </label>
            <label className="block text-sm font-semibold">
              数量
              <input
                type="number"
                min="1"
                inputMode="numeric"
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
          {!usesStoreInput && !selectedPrice ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              この顧客・商品・対象月の単価が単価マスタにありません。
            </p>
          ) : null}
          <button
            type="button"
            onClick={addDetail}
            disabled={!canAddDetail}
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
              <th className="px-4 py-3">{usesStoreInput ? "店舗" : "顧客ID"}</th>
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
                <td className="px-4 py-3 font-semibold">{detail.storeName ?? detail.customerId}</td>
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
  if (value === "10") return 10;
  if (value === "15") return 15;
  if (value === "20") return 20;
  return "endOfMonth";
}

function getDaysInMonth(targetMonth: string) {
  const [year, month] = targetMonth.split("-").map(Number);
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function moveDateToMonth(value: string, targetMonth: string) {
  if (!value || !targetMonth) return value;
  const day = Math.min(Number(value.slice(8, 10)), getDaysInMonth(targetMonth));
  return `${targetMonth}-${String(day).padStart(2, "0")}`;
}
