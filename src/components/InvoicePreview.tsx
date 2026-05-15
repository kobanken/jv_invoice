"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type { ClosingDay, Customer, CustomerType, SalesDetail } from "@/types";
import type { DeliveryListResponse, DeliveryRow, InvoiceSummary } from "@/types/api";
import { apiGet } from "@/lib/api/client";
import { useLiveCustomers } from "@/lib/api/customers";
import { downloadLineInvoiceImage, openGmailInvoiceDraft, openInvoicePdfPrint } from "@/lib/invoiceExports";
import { calculateInvoiceTotal, getInvoiceDetails } from "@/lib/invoices";
import { formatClosingDay, formatCurrencyJPY } from "@/lib/format";

export function InvoicePreview({
  customers,
  salesDetails,
}: {
  customers: Customer[];
  salesDetails: SalesDetail[];
}) {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialCustomerName = searchParams.get("customerName") ?? "";
  const initialCustomerType = parseCustomerType(searchParams.get("customerType"));
  const initialStoreName = searchParams.get("storeName") ?? "";
  const initialTargetMonth = searchParams.get("targetMonth") ?? "2026-05";
  const initialClosingDay = searchParams.get("closingDay") ?? "endOfMonth";
  const apiCustomerId = parseOptionalNumber(searchParams.get("apiCustomerId"));
  const apiStoreId = parseOptionalNumber(searchParams.get("storeId"));
  const { customers: liveCustomers, loading: customersLoading, error: customersError } = useLiveCustomers(undefined, customers);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [targetMonth, setTargetMonth] = useState(initialTargetMonth);
  const [closingDay, setClosingDay] = useState<string>(initialClosingDay);
  const [apiDetails, setApiDetails] = useState<SalesDetail[] | null>(null);
  const [apiSummary, setApiSummary] = useState<InvoiceSummary | null>(null);
  const [apiInvoiceLoading, setApiInvoiceLoading] = useState(false);
  const [apiInvoiceError, setApiInvoiceError] = useState("");
  const linkedCustomer = useMemo(() => {
    return liveCustomers.find((customer) => (
      (initialCustomerId && customer.customerId === initialCustomerId) ||
      (apiCustomerId !== null && customer.sourceApiCustomerId === apiCustomerId)
    ));
  }, [apiCustomerId, initialCustomerId, liveCustomers]);
  const fallbackCustomer = useMemo(() => {
    if (!initialCustomerId) return null;
    if (linkedCustomer || liveCustomers.some((customer) => customer.customerId === initialCustomerId)) return null;
    return buildFallbackCustomer({
      customerId: initialCustomerId,
      customerType: initialCustomerType,
      billingName: initialCustomerName,
      storeName: initialStoreName,
      closingDay: parseClosingDay(initialClosingDay),
    });
  }, [initialClosingDay, initialCustomerId, initialCustomerName, initialCustomerType, initialStoreName, linkedCustomer, liveCustomers]);
  const linkedCustomerId = linkedCustomer?.customerId ?? fallbackCustomer?.customerId ?? initialCustomerId;
  const shouldUseApiInvoice = Boolean(apiCustomerId && (!linkedCustomerId || customerId === linkedCustomerId));

  useEffect(() => {
    if (linkedCustomer && customerId !== linkedCustomer.customerId) {
      setCustomerId(linkedCustomer.customerId);
      setClosingDay(initialClosingDay || String(linkedCustomer.closingDay));
      return;
    }

    const firstCustomer = liveCustomers[0];
    if (!firstCustomer) {
      if (!initialCustomerId) {
        setCustomerId("");
      }
      return;
    }
    if (
      customerId &&
      (liveCustomers.some((customer) => customer.customerId === customerId) || fallbackCustomer?.customerId === customerId)
    ) {
      return;
    }
    if (!initialCustomerId) {
      setCustomerId(firstCustomer.customerId);
      setClosingDay(String(firstCustomer.closingDay));
    }
  }, [customerId, fallbackCustomer, initialClosingDay, initialCustomerId, linkedCustomer, liveCustomers]);

  useEffect(() => {
    if (!apiCustomerId || !targetMonth || !shouldUseApiInvoice) {
      setApiDetails(null);
      setApiSummary(null);
      return;
    }

    let isActive = true;
    setApiInvoiceLoading(true);
    setApiInvoiceError("");
    Promise.all([
      apiGet<DeliveryListResponse>("/deliveries.php", {
        customer_id: apiCustomerId,
        store_id: apiStoreId ?? null,
        billing_month: targetMonth,
      }),
      apiGet<InvoiceSummary>("/invoice-summary.php", {
        customer_id: apiCustomerId,
        store_id: apiStoreId ?? null,
        billing_month: targetMonth,
      }),
    ])
      .then(([deliveryData, summary]) => {
        if (!isActive) return;
        setApiDetails(deliveryData.rows.filter((row) => row.item_id !== null).map((row) => deliveryRowToSalesDetail(row)));
        setApiSummary(summary);
      })
      .catch((exception: unknown) => {
        if (!isActive) return;
        setApiDetails(null);
        setApiSummary(null);
        setApiInvoiceError(exception instanceof Error ? exception.message : "保存済み請求明細の取得に失敗しました。");
      })
      .finally(() => {
        if (isActive) setApiInvoiceLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [apiCustomerId, apiStoreId, shouldUseApiInvoice, targetMonth]);

  const displayCustomers = useMemo(() => {
    if (!fallbackCustomer) return liveCustomers;
    return [fallbackCustomer, ...liveCustomers];
  }, [fallbackCustomer, liveCustomers]);
  const selectedCustomer = displayCustomers.find((customer) => customer.customerId === customerId);
  const customerOptions = useMemo<CustomerSearchOption<string>[]>(() => {
    return displayCustomers.map((customer) => ({
      value: customer.customerId,
      label: `${customer.customerId} ${customer.storeName}`,
      keywords: `${customer.billingName} ${customer.storeName} ${customer.email} ${customer.notes}`,
    }));
  }, [displayCustomers]);
  const mockDetails = useMemo(() => {
    return getInvoiceDetails(salesDetails, customerId, targetMonth, parseClosingDay(closingDay));
  }, [closingDay, customerId, salesDetails, targetMonth]);
  const details = apiDetails ?? mockDetails;
  const total = apiSummary?.total ?? calculateInvoiceTotal(details);
  const closingDayLabel = formatClosingDay(parseClosingDay(closingDay));

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const customer = displayCustomers.find((item) => item.customerId === nextCustomerId);
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
          {apiInvoiceLoading ? <p className="text-xs text-slate-500">保存済み請求明細を読み込み中です。</p> : null}
          {apiInvoiceError ? <p className="text-xs text-amber-700">{apiInvoiceError}</p> : null}
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
            onClick={openInvoicePdfPrint}
            disabled={!selectedCustomer}
            className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            PDF出力
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedCustomer) return;
              openGmailInvoiceDraft({ customer: selectedCustomer, targetMonth, closingDayLabel, total, details });
            }}
            disabled={!selectedCustomer || !selectedCustomer.email}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Gmail下書き作成
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedCustomer) return;
              downloadLineInvoiceImage({ customer: selectedCustomer, targetMonth, closingDayLabel, total, details });
            }}
            disabled={!selectedCustomer}
            className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            LINE用画像出力
          </button>
        </div>
      </div>

      <div className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white p-10 shadow-sm print:min-h-0 print:max-w-none print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
          <div>
            <h3 className="text-3xl font-bold tracking-normal">請求書</h3>
            <p className="mt-2 text-sm text-slate-600">
              {targetMonth} / {closingDayLabel}
            </p>
          </div>
          <div className="text-right text-sm text-slate-700">
            <p>発行元: JVクリーニング</p>
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
            {apiSummary ? (
              <>
                <tr className="border-t border-slate-300">
                  <td colSpan={4} className="px-3 py-3 text-right font-semibold">
                    税抜合計
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(apiSummary.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-right font-semibold">
                    消費税
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(apiSummary.tax)}</td>
                </tr>
              </>
            ) : null}
            <tr className="border-t-2 border-slate-900">
              <td colSpan={4} className="px-3 py-4 text-right text-base font-bold">
                {apiSummary ? "税込合計" : "合計"}
              </td>
              <td className="px-3 py-4 text-right text-base font-bold">{formatCurrencyJPY(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500">
          PDF出力、Gmail送付文面、LINE送信用画像をこの画面から作成できます。
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

function parseCustomerType(value: string | null): CustomerType {
  return value === "cash" ? "cash" : "bank";
}

function parseOptionalNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function deliveryRowToSalesDetail(row: DeliveryRow): SalesDetail {
  return {
    salesId: `API-${row.header_id}-${row.item_id}`,
    customerId: String(row.customer_id),
    customerType: "bank",
    deliveryDate: row.delivery_date,
    productId: String(row.item_id),
    productName: row.item_name,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    amount: Number(row.amount),
    targetMonth: row.billing_month,
    closingDay: "endOfMonth",
    notes: row.item_note ?? "",
    createdAt: "",
    updatedAt: "",
  };
}

function buildFallbackCustomer({
  customerId,
  customerType,
  billingName,
  storeName,
  closingDay,
}: {
  customerId: string;
  customerType: CustomerType;
  billingName: string;
  storeName: string;
  closingDay: ClosingDay;
}): Customer {
  const base = {
    customerId,
    customerType,
    storeName: storeName || billingName || customerId,
    billingName: billingName || storeName || customerId,
    closingDay,
    invoiceDeliveryMethod: "gmail_pdf" as const,
    email: "",
    postalAddress: "",
    isLineTarget: false,
    notes: "請求一覧から引き継いだ表示用顧客",
    isActive: true,
  };

  if (customerType === "cash") {
    return {
      ...base,
      customerType: "cash",
      collectionStaff: "-",
      collectionMethod: "現金",
      collectionMemo: "",
    };
  }

  return {
    ...base,
    customerType: "bank",
    bankTransferName1: billingName || customerId,
    paymentCheckMemo: "",
  };
}
