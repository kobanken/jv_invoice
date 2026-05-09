"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClosingDay, Invoice } from "@/types";
import { formatClosingDay, formatCurrencyJPY, formatDeliveryMethod, formatPaymentStatus } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

function matchesClosingDay(closingDay: ClosingDay, selected: string) {
  if (!selected) return true;
  return String(closingDay) === selected;
}

export function InvoiceTable({
  invoices,
  title,
}: {
  invoices: Invoice[];
  title: string;
}) {
  const [targetMonth, setTargetMonth] = useState("2026-05");
  const [closingDay, setClosingDay] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [issueStatus, setIssueStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      return (
        invoice.targetMonth === targetMonth &&
        matchesClosingDay(invoice.closingDay, closingDay) &&
        (!deliveryMethod || invoice.deliveryMethod === deliveryMethod) &&
        (!paymentStatus || invoice.paymentStatus === paymentStatus) &&
        (!issueStatus || invoice.issueStatus === issueStatus) &&
        (!deliveryStatus || invoice.deliveryStatus === deliveryStatus)
      );
    });
  }, [closingDay, deliveryMethod, deliveryStatus, invoices, issueStatus, paymentStatus, targetMonth]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-3 xl:grid-cols-6">
        <input
          type="month"
          value={targetMonth}
          onChange={(event) => setTargetMonth(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label={`${title} 対象月`}
        />
        <select value={closingDay} onChange={(event) => setClosingDay(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">締め日すべて</option>
          <option value="15">15日締め</option>
          <option value="20">20日締め</option>
          <option value="endOfMonth">月末締め</option>
        </select>
        <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">請求書区分すべて</option>
          <option value="gmail_pdf">Gmail PDF</option>
          <option value="line">LINE</option>
          <option value="hand_delivery">手渡し</option>
          <option value="postal">郵送</option>
        </select>
        <select value={issueStatus} onChange={(event) => setIssueStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">発行状況すべて</option>
          <option value="not_issued">未発行</option>
          <option value="issued">発行済み</option>
        </select>
        <select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">送付状況すべて</option>
          <option value="not_delivered">未送付</option>
          <option value="delivered">送付済み</option>
        </select>
        <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">入金/集金すべて</option>
          <option value="unpaid">未</option>
          <option value="partial">一部</option>
          <option value="paid">完了</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">請求ID</th>
              <th className="px-4 py-3">店舗名</th>
              <th className="px-4 py-3">対象月</th>
              <th className="px-4 py-3">締め日</th>
              <th className="px-4 py-3">金額</th>
              <th className="px-4 py-3">区分</th>
              <th className="px-4 py-3">発行</th>
              <th className="px-4 py-3">送付</th>
              <th className="px-4 py-3">入金/集金</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.invoiceId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{invoice.invoiceId}</td>
                <td className="px-4 py-3">{invoice.storeName}</td>
                <td className="px-4 py-3">{invoice.targetMonth}</td>
                <td className="px-4 py-3">{formatClosingDay(invoice.closingDay)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrencyJPY(invoice.invoiceAmount)}</td>
                <td className="px-4 py-3">{formatDeliveryMethod(invoice.deliveryMethod)}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={invoice.issueStatus === "issued" ? "teal" : "amber"}>
                    {invoice.issueStatus === "issued" ? "発行済み" : "未発行"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={invoice.deliveryStatus === "delivered" ? "teal" : "amber"}>
                    {invoice.deliveryStatus === "delivered" ? "送付済み" : "未送付"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">{formatPaymentStatus(invoice.paymentStatus)}</td>
                <td className="px-4 py-3">
                  <Link href="/invoice-preview" className="text-sm font-semibold text-teal-700 hover:text-teal-900">
                    プレビュー
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">表示件数: {filteredInvoices.length} / {invoices.length}</p>
    </section>
  );
}
