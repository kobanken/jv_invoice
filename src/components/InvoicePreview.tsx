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
  const [apiRows, setApiRows] = useState<DeliveryRow[] | null>(null);
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
      setApiRows(null);
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
        const itemRows = deliveryData.rows.filter((row) => row.item_id !== null);
        setApiRows(itemRows);
        setApiDetails(itemRows.map((row) => deliveryRowToSalesDetail(row)));
        setApiSummary(summary);
      })
      .catch((exception: unknown) => {
        if (!isActive) return;
        setApiDetails(null);
        setApiRows(null);
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
  const storeBlocks = useMemo(() => {
    if (!apiRows) return null;
    return buildStoreInvoiceBlocks(apiRows, initialStoreName);
  }, [apiRows, initialStoreName]);
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

      <div className="invoice-paper mx-auto min-h-[1123px] w-full max-w-[1120px] bg-white p-8 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 print:pb-3">
          <div>
            <h3 className="text-3xl font-bold tracking-normal print:text-2xl">請求明細</h3>
            <p className="mt-4 text-xl font-bold print:mt-3 print:text-lg">{selectedCustomer?.billingName ?? "-"} 御中</p>
            <p className="mt-2 text-sm text-slate-600 print:text-xs">店舗: {apiStoreId ? initialStoreName || selectedCustomer?.storeName : "全店舗"} / 請求月: {targetMonth}</p>
          </div>
          <div className="text-right text-sm text-slate-700 print:text-xs">
            <p>対象期間: {targetMonth}-01 から月末</p>
            <p>締日: {closingDayLabel}</p>
            <p>発行日: {new Date().toISOString().slice(0, 10)}</p>
          </div>
        </div>

        {storeBlocks ? (
          <StoreInvoiceBlocks blocks={storeBlocks} summary={apiSummary} />
        ) : (
          <SimpleInvoiceDetails details={details} summary={apiSummary} total={total} />
        )}

        <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500 print:hidden">
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
    salesId: `API-${row.header_id}-${row.item_id ?? "empty"}`,
    customerId: String(row.customer_id),
    customerType: "bank",
    deliveryDate: row.delivery_date,
    productId: String(row.item_id ?? ""),
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

type StoreInvoiceBlock = {
  storeId: number;
  storeName: string;
  items: {
    key: string;
    itemName: string;
    unitPrice: number;
    totalQuantity: number;
    amount: number;
  }[];
};

function buildStoreInvoiceBlocks(rows: DeliveryRow[], fallbackStoreName: string): StoreInvoiceBlock[] {
  const blocks = new Map<number, StoreInvoiceBlock>();
  rows.forEach((row) => {
    const storeId = Number(row.store_id);
    const block = blocks.get(storeId) ?? {
      storeId,
      storeName: row.store_name || fallbackStoreName || `店舗ID: ${storeId}`,
      items: [],
    };

    const key = `${row.item_name}|${row.unit_price}|${row.category}`;
    let item = block.items.find((current) => current.key === key);
    if (!item) {
      item = {
        key,
        itemName: row.item_name,
        unitPrice: Number(row.unit_price),
        totalQuantity: 0,
        amount: 0,
      };
      block.items.push(item);
    }
    const quantity = Number(row.quantity || 0);
    item.totalQuantity += quantity;
    item.amount += Number(row.amount || 0);
    blocks.set(storeId, block);
  });

  return Array.from(blocks.values());
}

function StoreInvoiceBlocks({ blocks, summary }: { blocks: StoreInvoiceBlock[]; summary: InvoiceSummary | null }) {
  const isMultiColumn = blocks.length > 1;
  return (
    <div className="mt-6 print:mt-4">
      {blocks.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">指定条件の明細はありません。</div>
      ) : (
        <div className={isMultiColumn ? "invoice-store-grid grid gap-5 xl:grid-cols-2 print:grid-cols-2 print:gap-3" : "grid gap-5"}>
          {blocks.map((block) => (
            <section key={block.storeId} className="invoice-store-block break-inside-avoid">
              <h4 className="border-l-4 border-teal-700 pl-3 text-lg font-bold print:text-sm">{block.storeName}</h4>
              <div className="mt-3 overflow-x-auto print:overflow-visible">
                <table className="invoice-compact-table min-w-full text-left text-sm print:text-[9px]">
                  <thead className="border-y border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600 print:text-[8px]">
                    <tr>
                      <th className="px-2 py-2 print:px-1 print:py-1">商品名</th>
                      <th className="px-2 py-2 text-right print:px-1 print:py-1">単価</th>
                      <th className="px-2 py-2 text-right print:px-1 print:py-1">合計数量</th>
                      <th className="px-2 py-2 text-right print:px-1 print:py-1">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {block.items.map((item) => (
                      <tr key={item.key}>
                        <td className="px-2 py-2 font-semibold print:px-1 print:py-1">{item.itemName}</td>
                        <td className="px-2 py-2 text-right print:px-1 print:py-1">{formatCurrencyJPY(item.unitPrice)}</td>
                        <td className="px-2 py-2 text-right font-bold print:px-1 print:py-1">{item.totalQuantity}</td>
                        <td className="px-2 py-2 text-right font-bold print:px-1 print:py-1">{formatCurrencyJPY(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
      <InvoiceSummaryBox summary={summary} />
    </div>
  );
}

function SimpleInvoiceDetails({
  details,
  summary,
  total,
}: {
  details: SalesDetail[];
  summary: InvoiceSummary | null;
  total: number;
}) {
  return (
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
        {summary ? (
          <>
            <tr className="border-t border-slate-300">
              <td colSpan={4} className="px-3 py-3 text-right font-semibold">税抜合計</td>
              <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(summary.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="px-3 py-3 text-right font-semibold">消費税</td>
              <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(summary.tax)}</td>
            </tr>
          </>
        ) : null}
        <tr className="border-t-2 border-slate-900">
          <td colSpan={4} className="px-3 py-4 text-right text-base font-bold">{summary ? "税込合計" : "合計"}</td>
          <td className="px-3 py-4 text-right text-base font-bold">{formatCurrencyJPY(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function InvoiceSummaryBox({ summary }: { summary: InvoiceSummary | null }) {
  if (!summary) return null;
  return (
    <div className="mt-6 ml-auto w-full max-w-sm space-y-1 text-sm print:mt-4 print:max-w-xs print:text-[10px]">
      <SummaryLine label="商品合計" value={summary.product_total} />
      <SummaryLine label="配達料" value={summary.delivery_fee_total} />
      <SummaryLine label="その他手数料" value={summary.other_fee_total} />
      <SummaryLine label="税込合計" value={summary.total} strong />
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-2 ${strong ? "text-lg font-bold print:text-sm" : ""}`}>
      <span>{label}</span>
      <span>{formatCurrencyJPY(value)}</span>
    </div>
  );
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
