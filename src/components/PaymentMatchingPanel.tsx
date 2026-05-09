"use client";

import { useMemo, useState } from "react";
import type { BankCustomer, Invoice, PaymentRecord } from "@/types";
import { matchPaymentCandidates } from "@/lib/payment";
import { formatCurrencyJPY, formatPaymentStatus } from "@/lib/format";

export function PaymentMatchingPanel({
  customers,
  invoices,
}: {
  customers: BankCustomer[];
  invoices: Invoice[];
}) {
  const [paymentDate, setPaymentDate] = useState("2026-06-03");
  const [transferName, setTransferName] = useState("カ）アオヤマサロン");
  const [amount, setAmount] = useState(10800);

  const candidates = useMemo(() => {
    const paymentRecord: PaymentRecord = {
      paymentId: "PAY-MOCK",
      paymentCheckDate: new Date().toISOString().slice(0, 10),
      paymentDate,
      transferName,
      amount,
      matchStatus: "candidate",
      notes: "画面上の候補判定",
    };
    return matchPaymentCandidates(paymentRecord, invoices, customers);
  }, [amount, customers, invoices, paymentDate, transferName]);

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-base font-bold">入金情報入力</h3>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">
            入金日
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            入金名義
            <input
              value={transferName}
              onChange={(event) => setTransferName(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            入金額
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            銀行明細CSVは使わず、手入力した名義・金額・未入金請求・支払期限の近さから候補を出します。
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">候補</th>
              <th className="px-4 py-3">顧客</th>
              <th className="px-4 py-3">請求ID</th>
              <th className="px-4 py-3">請求額</th>
              <th className="px-4 py-3">状況</th>
              <th className="px-4 py-3">理由</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((candidate) => (
              <tr key={candidate.invoice.invoiceId}>
                <td className="px-4 py-3 font-bold text-teal-700">{candidate.score}点</td>
                <td className="px-4 py-3">
                  {candidate.customer.customerId} {candidate.customer.storeName}
                </td>
                <td className="px-4 py-3 font-semibold">{candidate.invoice.invoiceId}</td>
                <td className="px-4 py-3">{formatCurrencyJPY(candidate.invoice.invoiceAmount)}</td>
                <td className="px-4 py-3">{formatPaymentStatus(candidate.invoice.paymentStatus)}</td>
                <td className="px-4 py-3">{candidate.reasons.join("、")}</td>
              </tr>
            ))}
            {candidates.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  候補がありません。名義または金額を変更してください。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
