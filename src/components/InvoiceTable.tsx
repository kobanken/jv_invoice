"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClosingDay, Invoice } from "@/types";
import type { PaymentType, SavedInvoiceSummary } from "@/types/api";
import { apiGet, apiPatch } from "@/lib/api/client";
import { formatClosingDay, formatCurrencyJPY, formatDeliveryMethod, formatPaymentStatus } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

function matchesClosingDay(closingDay: ClosingDay, selected: string) {
  if (!selected) return true;
  return String(closingDay) === selected;
}

export function InvoiceTable({
  invoices,
  title,
  summaryPaymentType,
}: {
  invoices: Invoice[];
  title: string;
  summaryPaymentType?: PaymentType;
}) {
  const [apiInvoices, setApiInvoices] = useState<Invoice[]>([]);
  const [targetMonth, setTargetMonth] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [issueStatus, setIssueStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState("");
  const [loadError, setLoadError] = useState("");
  const displayInvoices = summaryPaymentType ? apiInvoices : invoices;

  useEffect(() => {
    if (!summaryPaymentType) return;

    let isActive = true;
    setIsLoading(true);
    setLoadError("");
    apiGet<SavedInvoiceSummary[]>("/invoice-summary.php", { payment_type: summaryPaymentType })
      .then((summaries) => {
        if (isActive) {
          setApiInvoices(summaries.map(summaryToInvoice));
        }
      })
      .catch((exception: unknown) => {
        if (isActive) {
          setLoadError(exception instanceof Error ? exception.message : "請求一覧の取得に失敗しました。");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [summaryPaymentType]);

  const filteredInvoices = useMemo(() => {
    return displayInvoices.filter((invoice) => {
      return (
        (!targetMonth || invoice.targetMonth === targetMonth) &&
        matchesClosingDay(invoice.closingDay, closingDay) &&
        (!deliveryMethod || invoice.deliveryMethod === deliveryMethod) &&
        (!paymentStatus || invoice.paymentStatus === paymentStatus) &&
        (!issueStatus || invoice.issueStatus === issueStatus) &&
        (!deliveryStatus || invoice.deliveryStatus === deliveryStatus)
      );
    });
  }, [closingDay, deliveryMethod, deliveryStatus, displayInvoices, issueStatus, paymentStatus, targetMonth]);

  async function updateSavedInvoiceStatus(
    invoice: Invoice,
    field: "issueStatus" | "deliveryStatus" | "paymentStatus",
    value: string,
  ) {
    if (!invoice.sourceSummaryId) return;
    setUpdatingInvoiceId(invoice.invoiceId);
    setLoadError("");
    try {
      const payload =
        field === "issueStatus"
          ? { id: invoice.sourceSummaryId, issue_status: value }
          : field === "deliveryStatus"
            ? { id: invoice.sourceSummaryId, delivery_status: value }
            : { id: invoice.sourceSummaryId, payment_status: value };
      const updated = await apiPatch<SavedInvoiceSummary>("/invoice-summary.php", payload);
      setApiInvoices((current) => current.map((item) => (
        item.sourceSummaryId === updated.id ? summaryToInvoice(updated) : item
      )));
    } catch (exception) {
      setLoadError(exception instanceof Error ? exception.message : "ステータス更新に失敗しました。");
    } finally {
      setUpdatingInvoiceId("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 border-b border-slate-200 pb-4 md:grid-cols-3 xl:grid-cols-6">
        <input
          type="month"
          value={targetMonth}
          onChange={(event) => setTargetMonth(event.target.value)}
          className="field"
          aria-label={`${title} 対象月`}
        />
        <select value={closingDay} onChange={(event) => setClosingDay(event.target.value)} className="field">
          <option value="">締め日すべて</option>
          <option value="10">10日締め</option>
          <option value="15">15日締め</option>
          <option value="20">20日締め</option>
          <option value="endOfMonth">月末締め</option>
        </select>
        <select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)} className="field">
          <option value="">請求書区分すべて</option>
          <option value="gmail_pdf">Gmail PDF</option>
          <option value="line">LINE</option>
          <option value="hand_delivery">手渡し</option>
          <option value="postal">郵送</option>
        </select>
        <select value={issueStatus} onChange={(event) => setIssueStatus(event.target.value)} className="field">
          <option value="">発行状況すべて</option>
          <option value="not_issued">未発行</option>
          <option value="issued">発行済み</option>
        </select>
        <select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} className="field">
          <option value="">送付状況すべて</option>
          <option value="not_delivered">未送付</option>
          <option value="delivered">送付済み</option>
        </select>
        <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="field">
          <option value="">入金/集金すべて</option>
          <option value="unpaid">未</option>
          <option value="partial">一部</option>
          <option value="paid">完了</option>
        </select>
      </div>
      {loadError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</div>
      ) : null}

      <div className="table-scroll">
        <table className="min-w-[920px] text-left text-sm">
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
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">読み込み中です。</td>
              </tr>
            ) : null}
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.invoiceId} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{invoice.invoiceId}</td>
                <td className="px-4 py-3">{invoice.storeName}</td>
                <td className="px-4 py-3">{invoice.targetMonth}</td>
                <td className="px-4 py-3">{formatClosingDay(invoice.closingDay)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrencyJPY(invoice.invoiceAmount)}</td>
                <td className="px-4 py-3">{formatDeliveryMethod(invoice.deliveryMethod)}</td>
                <td className="px-4 py-3">
                  {invoice.sourceSummaryId ? (
                    <select
                      value={invoice.issueStatus}
                      disabled={updatingInvoiceId === invoice.invoiceId}
                      onChange={(event) => updateSavedInvoiceStatus(invoice, "issueStatus", event.target.value)}
                      className="field min-w-28 py-1 text-xs"
                    >
                      <option value="not_issued">未発行</option>
                      <option value="issued">発行済み</option>
                    </select>
                  ) : (
                    <StatusBadge tone={invoice.issueStatus === "issued" ? "teal" : "amber"}>
                      {invoice.issueStatus === "issued" ? "発行済み" : "未発行"}
                    </StatusBadge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {invoice.sourceSummaryId ? (
                    <select
                      value={invoice.deliveryStatus}
                      disabled={updatingInvoiceId === invoice.invoiceId}
                      onChange={(event) => updateSavedInvoiceStatus(invoice, "deliveryStatus", event.target.value)}
                      className="field min-w-28 py-1 text-xs"
                    >
                      <option value="not_delivered">未送付</option>
                      <option value="delivered">送付済み</option>
                    </select>
                  ) : (
                    <StatusBadge tone={invoice.deliveryStatus === "delivered" ? "teal" : "amber"}>
                      {invoice.deliveryStatus === "delivered" ? "送付済み" : "未送付"}
                    </StatusBadge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {invoice.sourceSummaryId ? (
                    <select
                      value={invoice.paymentStatus}
                      disabled={updatingInvoiceId === invoice.invoiceId}
                      onChange={(event) => updateSavedInvoiceStatus(invoice, "paymentStatus", event.target.value)}
                      className="field min-w-28 py-1 text-xs"
                    >
                      <option value="unpaid">未</option>
                      <option value="partial">一部</option>
                      <option value="paid">完了</option>
                      <option value="overpaid">過入金</option>
                    </select>
                  ) : formatPaymentStatus(invoice.paymentStatus)}
                </td>
                <td className="px-4 py-3">
                  <Link href={buildPreviewHref(invoice)} className="text-sm font-semibold text-teal-700 hover:text-teal-900">
                    プレビュー
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">保存済みの請求集計がありません。</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">表示件数: {filteredInvoices.length} / {displayInvoices.length}</p>
    </section>
  );
}

function summaryToInvoice(summary: SavedInvoiceSummary): Invoice {
  const customerType = summary.payment_type === "bank_transfer" ? "bank" : "cash";
  return {
    invoiceId: `INV-${summary.billing_month}-${summary.customer_id}-${summary.store_id ?? 0}`,
    sourceSummaryId: summary.id,
    apiCustomerId: summary.customer_id,
    apiStoreId: summary.store_id,
    customerId: summary.customer_code,
    customerType,
    billingName: summary.customer_name,
    storeName: summary.store_name ?? `${summary.customer_name}（全店舗）`,
    targetMonth: summary.billing_month,
    closingDay: summary.closing_day === 31 ? "endOfMonth" : summary.closing_day as ClosingDay,
    invoiceAmount: Number(summary.total),
    deliveryMethod: summary.delivery_method,
    issueStatus: summary.issue_status ?? "not_issued",
    deliveryStatus: summary.delivery_status ?? "not_delivered",
    paymentStatus: summary.payment_status ?? "unpaid",
    issueDate: summary.issue_date ?? undefined,
    deliveryDate: summary.delivery_date ?? undefined,
    paymentDate: summary.payment_date ?? undefined,
    dueDate: `${summary.billing_month}-末`,
    statusNote: summary.status_note ?? undefined,
    notes: summary.status_note ?? "",
  };
}

function buildPreviewHref(invoice: Invoice) {
  const params = new URLSearchParams({
    customerId: invoice.customerId,
    customerType: invoice.customerType,
    targetMonth: invoice.targetMonth,
    closingDay: String(invoice.closingDay),
  });
  if (invoice.apiCustomerId) {
    params.set("apiCustomerId", String(invoice.apiCustomerId));
  }
  if (invoice.apiStoreId) {
    params.set("storeId", String(invoice.apiStoreId));
  }
  params.set("customerName", invoice.billingName ?? invoice.storeName);
  params.set("storeName", invoice.storeName);
  return `/invoice-preview?${params.toString()}`;
}
