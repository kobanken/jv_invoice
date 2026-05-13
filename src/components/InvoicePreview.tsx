"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type { ClosingDay, Customer, SalesDetail } from "@/types";
import { useLiveCustomers } from "@/lib/api/customers";
import { calculateInvoiceTotal, getInvoiceDetails } from "@/lib/invoices";
import { formatClosingDay, formatCurrencyJPY } from "@/lib/format";

export function InvoicePreview({
  customers,
  salesDetails,
}: {
  customers: Customer[];
  salesDetails: SalesDetail[];
}) {
  const { customers: liveCustomers, loading: customersLoading, error: customersError } = useLiveCustomers(undefined, customers);
  const [customerId, setCustomerId] = useState("");
  const [targetMonth, setTargetMonth] = useState("2026-05");
  const [closingDay, setClosingDay] = useState<string>("endOfMonth");

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

  const selectedCustomer = liveCustomers.find((customer) => customer.customerId === customerId);
  const customerOptions = useMemo<CustomerSearchOption<string>[]>(() => {
    return liveCustomers.map((customer) => ({
      value: customer.customerId,
      label: `${customer.customerId} ${customer.storeName}`,
      keywords: `${customer.billingName} ${customer.storeName} ${customer.email} ${customer.notes}`,
    }));
  }, [liveCustomers]);
  const details = useMemo(() => {
    return getInvoiceDetails(salesDetails, customerId, targetMonth, parseClosingDay(closingDay));
  }, [closingDay, customerId, salesDetails, targetMonth]);
  const total = calculateInvoiceTotal(details);

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const customer = liveCustomers.find((item) => item.customerId === nextCustomerId);
    if (customer) setClosingDay(String(customer.closingDay));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <div className="surface no-print p-5">
        <h3 className="text-base font-bold">表示条件</h3>
        <div className="mt-4 space-y-4">
          <CustomerSearchField
            label="顧客"
            value={customerId}
            options={customerOptions}
            onChange={handleCustomerChange}
          />
          {customersLoading ? <p className="text-xs text-slate-500">顧客マスタを読み込み中です。</p> : null}
          {customersError ? <p className="text-xs text-amber-700">顧客マスタを取得できないため、既存データで表示しています。</p> : null}
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
          <button
            type="button"
            disabled
            className="w-full rounded-md bg-slate-300 px-4 py-2 text-sm font-semibold text-white"
          >
            PDF出力予定
          </button>
        </div>
      </div>

      <div className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white p-10 shadow-sm print:min-h-0 print:max-w-none print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
          <div>
            <h3 className="text-3xl font-bold tracking-normal">請求書</h3>
            <p className="mt-2 text-sm text-slate-600">
              {targetMonth} / {formatClosingDay(parseClosingDay(closingDay))}
            </p>
          </div>
          <div className="text-right text-sm text-slate-700">
            <p>発行元: JVクリーニング</p>
            <p>登録番号: インボイス対応時に設定</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-slate-500">請求先</p>
            <p className="mt-2 text-xl font-bold">{selectedCustomer?.billingName ?? "-"}</p>
            <p className="mt-1 text-sm">{selectedCustomer?.storeName}</p>
            <p className="mt-1 text-sm text-slate-600">顧客ID: {selectedCustomer?.customerId}</p>
          </div>
          <div className="rounded-md border border-slate-300 bg-slate-50 p-4 text-right">
            <p className="text-sm text-slate-500">ご請求金額</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrencyJPY(total)}</p>
          </div>
        </div>

        <table className="mt-10 min-w-full text-left text-sm">
          <thead className="border-y border-slate-300 bg-slate-50">
            <tr>
              <th className="px-3 py-3">日付</th>
              <th className="px-3 py-3">商品名</th>
              <th className="px-3 py-3 text-right">単価</th>
              <th className="px-3 py-3 text-right">数量</th>
              <th className="px-3 py-3 text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {details.map((detail) => (
              <tr key={detail.salesId}>
                <td className="px-3 py-3">{detail.deliveryDate}</td>
                <td className="px-3 py-3">{detail.productName}</td>
                <td className="px-3 py-3 text-right">{formatCurrencyJPY(detail.unitPrice)}</td>
                <td className="px-3 py-3 text-right">{detail.quantity}</td>
                <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(detail.amount)}</td>
              </tr>
            ))}
            {details.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  指定条件の明細はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <td colSpan={4} className="px-3 py-4 text-right text-base font-bold">
                合計
              </td>
              <td className="px-3 py-4 text-right text-base font-bold">{formatCurrencyJPY(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500">
          TODO Phase 3: PDF出力、インボイス登録番号、税率別集計、電子送付履歴を追加。
        </div>
      </div>
    </section>
  );
}

function parseClosingDay(value: string): ClosingDay {
  if (value === "15") return 15;
  if (value === "20") return 20;
  return "endOfMonth";
}
