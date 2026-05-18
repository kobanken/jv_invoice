"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankCustomer, Invoice, PaymentCandidate, PaymentRecord, PaymentStatus } from "@/types";
import type { SavedInvoiceSummary } from "@/types/api";
import { apiGet, apiPatch } from "@/lib/api/client";
import { useLiveCustomers } from "@/lib/api/customers";
import { summaryToInvoice } from "@/lib/api/invoiceSummaries";
import { numericInputAttributes } from "@/lib/inputAttributes";
import { matchPaymentCandidates } from "@/lib/payment";
import { formatCurrencyJPY, formatPaymentStatus } from "@/lib/format";

export function PaymentMatchingPanel({
  customers,
  invoices,
}: {
  customers: BankCustomer[];
  invoices: Invoice[];
}) {
  const { customers: liveCustomers, loading: customersLoading, error: customersError } = useLiveCustomers("bank", customers);
  const [apiInvoices, setApiInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [transferName, setTransferName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const amount = useMemo(() => parseAmountInput(amountInput), [amountInput]);
  const displayInvoices = apiInvoices.length > 0 ? apiInvoices : invoices;

  useEffect(() => {
    let isActive = true;
    setInvoicesLoading(true);
    setLoadError("");
    apiGet<SavedInvoiceSummary[]>("/invoice-summary.php", { payment_type: "bank_transfer" })
      .then((summaries) => {
        if (isActive) {
          setApiInvoices(summaries.map(summaryToInvoice));
        }
      })
      .catch((exception: unknown) => {
        if (isActive) {
          setApiInvoices([]);
          setLoadError(exception instanceof Error ? exception.message : "振込請求一覧の取得に失敗しました。");
        }
      })
      .finally(() => {
        if (isActive) {
          setInvoicesLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const candidates = useMemo(() => {
    const paymentRecord: PaymentRecord = {
      paymentId: "PAY-CANDIDATE",
      paymentCheckDate: new Date().toISOString().slice(0, 10),
      paymentDate,
      transferName,
      amount: amount ?? 0,
      matchStatus: "candidate",
      notes: "画面上の候補判定",
    };
    const bankCustomers = liveCustomers.filter((customer): customer is BankCustomer => customer.customerType === "bank");
    return matchPaymentCandidates(paymentRecord, displayInvoices, bankCustomers);
  }, [amount, displayInvoices, liveCustomers, paymentDate, transferName]);

  async function confirmPayment(candidate: PaymentCandidate) {
    if (!candidate.invoice.sourceSummaryId || amount === null) return;
    const paymentStatus = resolvePaymentStatus(candidate.invoice.invoiceAmount, amount);
    setUpdatingInvoiceId(candidate.invoice.invoiceId);
    setLoadError("");
    try {
      const updated = await apiPatch<SavedInvoiceSummary>("/invoice-summary.php", {
        id: candidate.invoice.sourceSummaryId,
        payment_status: paymentStatus,
        payment_date: paymentDate || new Date().toISOString().slice(0, 10),
        status_note: buildPaymentNote(transferName, amount),
      });
      setApiInvoices((current) => current.map((invoice) => (
        invoice.sourceSummaryId === updated.id ? summaryToInvoice(updated) : invoice
      )));
    } catch (exception) {
      setLoadError(exception instanceof Error ? exception.message : "入金確定に失敗しました。");
    } finally {
      setUpdatingInvoiceId("");
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="surface p-4">
        <h3 className="text-base font-bold">入金情報入力</h3>
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold">
            入金日
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="field mt-1 w-full font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            入金名義
            <input
              value={transferName}
              onChange={(event) => setTransferName(event.target.value)}
              className="field mt-1 w-full font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            入金額
            <input
              {...numericInputAttributes}
              type="text"
              value={amountInput}
              placeholder="例: 12345"
              onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
              className="field mt-1 w-full font-normal"
            />
          </label>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            銀行明細CSVは使わず、手入力した名義・金額・未入金請求・支払期限の近さから候補を出します。
          </p>
          <p className="text-[11px] leading-5 text-slate-500">
            候補表示は自動です。入金処理を保存する場合は、候補行の入金確定を押してください。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loadError || customersError ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError || customersError}
          </div>
        ) : null}
        <div className="grid gap-3 md:hidden">
          {invoicesLoading || customersLoading ? (
            <div className="surface px-4 py-6 text-center text-sm text-slate-500">
              候補を読み込み中です。
            </div>
          ) : null}
          {candidates.map((candidate) => (
            <article key={candidate.invoice.invoiceId} className="surface p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={getScoreBadgeClass(candidate.score)}>{candidate.score}点</div>
                  <div className="mt-2 font-semibold text-slate-900">{candidate.customer.storeName}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{getCustomerDisplayName(candidate.customer)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold">{formatCurrencyJPY(candidate.invoice.invoiceAmount)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatPaymentStatus(candidate.invoice.paymentStatus)}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-500">請求ID: </span>
                  {candidate.invoice.invoiceId}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">理由: </span>
                  {candidate.reasons.join("、")}
                </div>
              </div>
              <div className="mt-4">
                {candidate.invoice.sourceSummaryId ? (
                  <button
                    type="button"
                    disabled={amount === null || updatingInvoiceId === candidate.invoice.invoiceId}
                    onClick={() => confirmPayment(candidate)}
                    className="w-full rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {updatingInvoiceId === candidate.invoice.invoiceId ? "保存中" : "入金確定"}
                  </button>
                ) : (
                  <span className="block text-center text-xs text-slate-400">保存不可</span>
                )}
              </div>
            </article>
          ))}
          {!invoicesLoading && !customersLoading && candidates.length === 0 ? (
            <div className="surface px-4 py-6 text-sm text-slate-500">
              候補がありません。名義または金額を変更してください。
            </div>
          ) : null}
        </div>
        <div className="table-scroll hidden md:block">
          <table className="min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">候補</th>
                <th className="px-4 py-3">顧客</th>
                <th className="px-4 py-3">請求ID</th>
                <th className="px-4 py-3">請求額</th>
                <th className="px-4 py-3">状況</th>
                <th className="px-4 py-3">理由</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesLoading || customersLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    候補を読み込み中です。
                  </td>
                </tr>
              ) : null}
              {candidates.map((candidate) => (
                <tr key={candidate.invoice.invoiceId}>
                  <td className="px-4 py-3">
                    <span className={getScoreBadgeClass(candidate.score)}>{candidate.score}点</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{candidate.customer.storeName}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{getCustomerDisplayName(candidate.customer)}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{candidate.invoice.invoiceId}</td>
                  <td className="px-4 py-3">{formatCurrencyJPY(candidate.invoice.invoiceAmount)}</td>
                  <td className="px-4 py-3">{formatPaymentStatus(candidate.invoice.paymentStatus)}</td>
                  <td className="px-4 py-3">{candidate.reasons.join("、")}</td>
                  <td className="px-4 py-3">
                    {candidate.invoice.sourceSummaryId ? (
                      <button
                        type="button"
                        disabled={amount === null || updatingInvoiceId === candidate.invoice.invoiceId}
                        onClick={() => confirmPayment(candidate)}
                        className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {updatingInvoiceId === candidate.invoice.invoiceId ? "保存中" : "入金確定"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">保存不可</span>
                    )}
                  </td>
                </tr>
              ))}
              {!invoicesLoading && !customersLoading && candidates.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    候補がありません。名義または金額を変更してください。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function sanitizeAmountInput(value: string) {
  return normalizeFullWidthDigits(value).replace(/[^\d]/g, "");
}

function parseAmountInput(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(sanitizeAmountInput(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFullWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
}

function resolvePaymentStatus(invoiceAmount: number, paymentAmount: number): PaymentStatus {
  if (paymentAmount === invoiceAmount) return "paid";
  if (paymentAmount > invoiceAmount) return "overpaid";
  return "partial";
}

function buildPaymentNote(transferName: string, paymentAmount: number) {
  const name = transferName.trim();
  return [`振込入金確認`, name ? `名義: ${name}` : "", `入金額: ${formatCurrencyJPY(paymentAmount)}`]
    .filter(Boolean)
    .join(" / ");
}

function getCustomerDisplayName(customer: BankCustomer) {
  return customer.billingName || customer.customerId;
}

function getScoreBadgeClass(score: number) {
  const baseClass = "inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-bold";
  if (score < 40) {
    return `${baseClass} bg-red-50 text-red-700 ring-1 ring-red-200`;
  }
  if (score < 70) {
    return `${baseClass} bg-amber-50 text-amber-700 ring-1 ring-amber-200`;
  }
  return `${baseClass} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`;
}
