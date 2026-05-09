"use client";

import { useMemo, useState } from "react";
import type { BankCustomer, CashCustomer, ClosingDay, Customer } from "@/types";
import { formatClosingDay, formatDeliveryMethod } from "@/lib/format";

type Props =
  | { customerType: "bank"; customers: BankCustomer[] }
  | { customerType: "cash"; customers: CashCustomer[] };

function matchesClosingDay(customerClosingDay: ClosingDay, selected: string) {
  if (!selected) return true;
  return String(customerClosingDay) === selected;
}

export function CustomerTable({ customerType, customers }: Props) {
  const [query, setQuery] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [sortKey, setSortKey] = useState<"customerId" | "storeName">("customerId");

  const filteredCustomers = useMemo(() => {
    return [...customers]
      .filter((customer) => {
        const text = `${customer.customerId} ${customer.storeName} ${customer.billingName} ${customer.notes}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          matchesClosingDay(customer.closingDay, closingDay) &&
          (!deliveryMethod || customer.invoiceDeliveryMethod === deliveryMethod)
        );
      })
      .sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), "ja"));
  }, [closingDay, customers, deliveryMethod, query, sortKey]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="顧客ID・店舗名で検索"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={closingDay}
          onChange={(event) => setClosingDay(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">締め日すべて</option>
          <option value="15">15日締め</option>
          <option value="20">20日締め</option>
          <option value="endOfMonth">月末締め</option>
        </select>
        <select
          value={deliveryMethod}
          onChange={(event) => setDeliveryMethod(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">請求書区分すべて</option>
          <option value="gmail_pdf">Gmail PDF</option>
          <option value="line">LINE</option>
          <option value="hand_delivery">手渡し</option>
          <option value="postal">郵送</option>
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as "customerId" | "storeName")}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="customerId">顧客ID順</option>
          <option value="storeName">店舗名順</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">顧客ID</th>
              <th className="px-4 py-3">店舗名</th>
              <th className="px-4 py-3">請求先名</th>
              <th className="px-4 py-3">締め日</th>
              <th className="px-4 py-3">請求書区分</th>
              {customerType === "bank" ? (
                <>
                  <th className="px-4 py-3">メール</th>
                  <th className="px-4 py-3">振込名義</th>
                </>
              ) : (
                <th className="px-4 py-3">集金担当</th>
              )}
              <th className="px-4 py-3">備考</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <tr key={customer.customerId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{customer.customerId}</td>
                <td className="px-4 py-3">{customer.storeName}</td>
                <td className="px-4 py-3">{customer.billingName}</td>
                <td className="px-4 py-3">{formatClosingDay(customer.closingDay)}</td>
                <td className="px-4 py-3">{formatDeliveryMethod(customer.invoiceDeliveryMethod)}</td>
                {customer.customerType === "bank" ? (
                  <>
                    <td className="px-4 py-3">{customer.email || "-"}</td>
                    <td className="px-4 py-3">{customer.bankTransferName1}</td>
                  </>
                ) : (
                  <td className="px-4 py-3">{customer.collectionStaff}</td>
                )}
                <td className="px-4 py-3 text-slate-600">{customer.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        表示件数: {filteredCustomers.length} / {customers.length}
        {customerType === "cash" ? "。現金顧客は cash データソースのみを参照しています。" : ""}
      </p>
    </section>
  );
}

export type { Customer };
