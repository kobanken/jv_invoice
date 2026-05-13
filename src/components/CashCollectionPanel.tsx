"use client";

import { useMemo, useState } from "react";
import type { CashCollectionRecord, CashCustomer, Invoice } from "@/types";
import { useLiveCustomers } from "@/lib/api/customers";
import { calculateCashCollectionDifference, resolveCashCollectionStatus } from "@/lib/cashCollections";
import { formatCurrencyJPY } from "@/lib/format";

export function CashCollectionPanel({
  customers,
  invoices,
  records,
}: {
  customers: CashCustomer[];
  invoices: Invoice[];
  records: CashCollectionRecord[];
}) {
  const { customers: liveCustomers } = useLiveCustomers("cash", customers);
  const [collectionAmounts, setCollectionAmounts] = useState<Record<string, number>>(() => {
    return Object.fromEntries(records.map((record) => [record.collectionId, record.collectedAmount]));
  });

  const rows = useMemo(() => {
    return records.map((record) => {
      const collectedAmount = collectionAmounts[record.collectionId] ?? 0;
      const difference = calculateCashCollectionDifference(record.invoiceAmount, collectedAmount);
      const status = resolveCashCollectionStatus(record.invoiceAmount, collectedAmount);
      const customer = liveCustomers.find((item) => item.customerId === record.customerId);
      const invoice = invoices.find((item) => item.invoiceId === record.invoiceId);
      return { ...record, collectedAmount, difference, status, customer, invoice };
    });
  }, [collectionAmounts, invoices, liveCustomers, records]);

  return (
    <div className="table-scroll">
      <table className="min-w-[920px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-4 py-3">顧客名</th>
            <th className="px-4 py-3">対象月</th>
            <th className="px-4 py-3">請求金額</th>
            <th className="px-4 py-3">集金額</th>
            <th className="px-4 py-3">差額</th>
            <th className="px-4 py-3">集金日</th>
            <th className="px-4 py-3">集金担当</th>
            <th className="px-4 py-3">状況</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.collectionId}>
              <td className="px-4 py-3">{row.customer?.storeName ?? row.customerId}</td>
              <td className="px-4 py-3">{row.targetMonth}</td>
              <td className="px-4 py-3">{formatCurrencyJPY(row.invoiceAmount)}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  value={row.collectedAmount}
                  onChange={(event) =>
                    setCollectionAmounts((current) => ({
                      ...current,
                      [row.collectionId]: Number(event.target.value),
                    }))
                  }
                  className="field w-32"
                />
              </td>
              <td className={`px-4 py-3 font-semibold ${row.difference === 0 ? "text-teal-700" : "text-amber-700"}`}>
                {formatCurrencyJPY(row.difference)}
              </td>
              <td className="px-4 py-3">{row.collectionDate || "-"}</td>
              <td className="px-4 py-3">{row.collectionStaff}</td>
              <td className="px-4 py-3">{formatCollectionStatus(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCollectionStatus(status: CashCollectionRecord["status"]) {
  const labels: Record<CashCollectionRecord["status"], string> = {
    not_collected: "未集金",
    collected: "集金済み",
    partial: "一部集金",
    over_collected: "過集金",
  };
  return labels[status];
}
