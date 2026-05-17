"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type { ClosingDay, Customer, CustomerType, SalesDetail } from "@/types";
import type { DeliveryListResponse, DeliveryRow, InvoiceSummary } from "@/types/api";
import { apiGet } from "@/lib/api/client";
import { useLiveCustomers } from "@/lib/api/customers";
import { downloadLineInvoiceImage, downloadLineInvoiceImages, openGmailInvoiceDraft, type InvoiceImageKind } from "@/lib/invoiceExports";
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
  const [printMode, setPrintMode] = useState<"all" | InvoiceImageKind | null>(null);
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

  useEffect(() => {
    function resetPrintMode() {
      setPrintMode(null);
    }
    window.addEventListener("afterprint", resetPrintMode);
    return () => window.removeEventListener("afterprint", resetPrintMode);
  }, []);

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
  const statementTable = useMemo(() => buildStatementTable(details, apiRows), [apiRows, details]);
  const total = apiSummary?.total ?? calculateInvoiceTotal(details);
  const closingDayLabel = formatClosingDay(parseClosingDay(closingDay));
  const dueDate = calculatePaymentDueDate(targetMonth, parseClosingDay(closingDay));
  const periodLabel = buildPeriodLabel(targetMonth);
  const exportPayload = selectedCustomer
    ? { customer: selectedCustomer, targetMonth, closingDayLabel, total, details, dueDate, periodLabel, notes: selectedCustomer.notes }
    : null;

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    const customer = displayCustomers.find((item) => item.customerId === nextCustomerId);
    if (customer) setClosingDay(String(customer.closingDay));
  }

  function printDocuments(mode: "all" | InvoiceImageKind) {
    setPrintMode(mode);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  function downloadImage(kind: InvoiceImageKind) {
    if (!exportPayload) return;
    downloadLineInvoiceImage(exportPayload, kind);
  }

  return (
    <section className={`invoice-preview-layout grid gap-6 xl:grid-cols-[320px_1fr] ${printMode ? `invoice-print-${printMode}` : ""}`}>
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
              <option value="10">10日締め</option>
              <option value="15">15日締め</option>
              <option value="20">20日締め</option>
              <option value="endOfMonth">月末締め</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => printDocuments("all")}
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
              if (!exportPayload) return;
              downloadLineInvoiceImages(exportPayload);
            }}
            disabled={!selectedCustomer}
            className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            LINE用画像出力
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <DocumentActionBar
          title="請求明細"
          onPdf={() => printDocuments("statement")}
          onPng={() => downloadImage("statement")}
          onPrint={() => printDocuments("statement")}
          disabled={!selectedCustomer}
        />
        <StatementDocument
          selectedCustomer={selectedCustomer}
          targetMonth={targetMonth}
          closingDayLabel={closingDayLabel}
          periodLabel={periodLabel}
          table={statementTable}
          summary={apiSummary}
          total={total}
          storeLabel={apiStoreId ? initialStoreName || selectedCustomer?.storeName || "-" : "全店舗"}
        />

        <DocumentActionBar
          title="請求書"
          onPdf={() => printDocuments("invoice")}
          onPng={() => downloadImage("invoice")}
          onPrint={() => printDocuments("invoice")}
          disabled={!selectedCustomer}
        />
        <InvoiceDocument
          selectedCustomer={selectedCustomer}
          targetMonth={targetMonth}
          closingDayLabel={closingDayLabel}
          periodLabel={periodLabel}
          dueDate={dueDate}
          storeBlocks={storeBlocks}
          details={details}
          summary={apiSummary}
          total={total}
          storeLabel={apiStoreId ? initialStoreName || selectedCustomer?.storeName || "-" : "全店舗"}
        />
      </div>
    </section>
  );
}

function DocumentActionBar({
  title,
  onPdf,
  onPng,
  onPrint,
  disabled,
}: {
  title: string;
  onPdf: () => void;
  onPng: () => void;
  onPrint: () => void;
  disabled: boolean;
}) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPdf} disabled={disabled} className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300">
          PDF
        </button>
        <button type="button" onClick={onPng} disabled={disabled} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300">
          PNG
        </button>
        <button type="button" onClick={onPrint} disabled={disabled} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:bg-slate-300">
          印刷
        </button>
      </div>
    </div>
  );
}

function StatementDocument({
  selectedCustomer,
  targetMonth,
  closingDayLabel,
  periodLabel,
  table,
  summary,
  total,
  storeLabel,
}: {
  selectedCustomer?: Customer;
  targetMonth: string;
  closingDayLabel: string;
  periodLabel: string;
  table: StatementTable;
  summary: InvoiceSummary | null;
  total: number;
  storeLabel: string;
}) {
  const dateColumnWidth = table.dates.length > 16 ? "min-w-7" : "min-w-9";

  return (
    <div className="invoice-document invoice-document-statement invoice-paper mx-auto min-h-[794px] w-full max-w-[1120px] bg-white p-7 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <div className="text-center">
        <h3 className="text-lg font-bold tracking-normal print:text-sm">
          {selectedCustomer?.billingName ?? "-"}　{targetMonth} 請求明細表
        </h3>
      </div>
      <div className="mt-2 flex items-end justify-between text-xs text-slate-700 print:mt-1 print:text-[8px]">
        <p className="font-semibold">{storeLabel}</p>
        <div className="text-right">
          <p>対象期間: {periodLabel}</p>
          <p>締日: {closingDayLabel} / 発行日: {new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto print:overflow-visible">
        <table className="invoice-statement-table min-w-full border-collapse text-left text-[11px] print:text-[6.5px]">
          <thead>
            <tr>
              <th className="w-24 border border-slate-400 px-1.5 py-1 text-center font-bold print:w-20 print:px-1 print:py-0.5">店舗</th>
              <th className="w-28 border border-slate-400 px-1.5 py-1 text-center font-bold print:w-24 print:px-1 print:py-0.5">商品名</th>
              {table.dates.map((date) => (
                <th key={date} className={`${dateColumnWidth} border border-slate-400 px-1 py-1 text-center font-bold text-red-600 print:px-0.5 print:py-0.5`}>
                  {formatDayLabel(date)}
                </th>
              ))}
              <th className="w-16 border border-slate-400 px-1.5 py-1 text-center font-bold print:w-12 print:px-1 print:py-0.5">単価</th>
              <th className="w-14 border border-slate-400 px-1.5 py-1 text-center font-bold print:w-10 print:px-1 print:py-0.5">数量</th>
              <th className="w-20 border border-slate-400 px-1.5 py-1 text-center font-bold print:w-16 print:px-1 print:py-0.5">金額</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={row.key} className={row.isFirstStoreRow && index > 0 ? "border-t-2 border-t-slate-600" : ""}>
                <td className="border border-slate-400 px-1.5 py-1 font-semibold print:px-1 print:py-0.5">
                  {row.isFirstStoreRow ? row.storeName : ""}
                </td>
                <td className="border border-slate-400 px-1.5 py-1 font-semibold print:px-1 print:py-0.5">{row.itemName}</td>
                {table.dates.map((date) => (
                  <td key={date} className="border border-slate-400 px-1 py-1 text-center print:px-0.5 print:py-0.5">
                    {row.quantities[date] ? formatQuantity(row.quantities[date]) : ""}
                  </td>
                ))}
                <td className="border border-slate-400 px-1.5 py-1 text-right print:px-1 print:py-0.5">{formatCurrencyJPY(row.unitPrice)}</td>
                <td className="border border-slate-400 px-1.5 py-1 text-right font-semibold print:px-1 print:py-0.5">{formatQuantity(row.totalQuantity)}</td>
                <td className="border border-slate-400 px-1.5 py-1 text-right font-semibold print:px-1 print:py-0.5">{formatCurrencyJPY(row.amount)}</td>
              </tr>
            ))}
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.dates.length + 5} className="border border-slate-400 px-3 py-8 text-center text-slate-500">
                  指定条件の明細はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            {summary ? (
              <>
                <StatementTotalRow colSpan={table.dates.length + 4} label="小計" value={summary.subtotal} />
                <StatementTotalRow colSpan={table.dates.length + 4} label="消費税" value={summary.tax} />
              </>
            ) : null}
            <StatementTotalRow colSpan={table.dates.length + 4} label="税込合計" value={total} strong />
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function StatementTotalRow({ colSpan, label, value, strong = false }: { colSpan: number; label: string; value: number; strong?: boolean }) {
  return (
    <tr className={strong ? "font-bold" : ""}>
      <td colSpan={colSpan} className="border border-slate-400 px-2 py-1 text-right print:px-1 print:py-0.5">
        {label}
      </td>
      <td className="border border-slate-400 px-2 py-1 text-right print:px-1 print:py-0.5">
        {formatCurrencyJPY(value)}
      </td>
    </tr>
  );
}

function InvoiceDocument({
  selectedCustomer,
  targetMonth,
  closingDayLabel,
  periodLabel,
  dueDate,
  storeBlocks,
  details,
  summary,
  total,
  storeLabel,
}: {
  selectedCustomer?: Customer;
  targetMonth: string;
  closingDayLabel: string;
  periodLabel: string;
  dueDate: string;
  storeBlocks: StoreInvoiceBlock[] | null;
  details: SalesDetail[];
  summary: InvoiceSummary | null;
  total: number;
  storeLabel: string;
}) {
  return (
    <div className="invoice-document invoice-document-invoice invoice-paper mx-auto min-h-[1123px] w-full max-w-[1120px] bg-white p-8 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 print:pb-3">
        <div>
          <h3 className="text-3xl font-bold tracking-normal print:text-2xl">請求書</h3>
          <p className="mt-4 text-xl font-bold print:mt-3 print:text-lg">{selectedCustomer?.billingName ?? "-"} 御中</p>
          <p className="mt-2 text-sm text-slate-600 print:text-xs">店舗: {storeLabel} / 請求月: {targetMonth}</p>
        </div>
        <div className="min-w-[320px] text-right text-sm text-slate-700 print:min-w-[240px] print:text-xs">
          <p>対象期間: {periodLabel}</p>
          <p>締日: {closingDayLabel}</p>
          <p className="font-bold text-slate-950">支払い期限: {dueDate}</p>
          <p>発行日: {new Date().toISOString().slice(0, 10)}</p>
          <div className="mt-4 ml-auto flex h-20 w-28 items-center justify-center border border-dashed border-slate-400 text-xs text-slate-500 print:h-14 print:w-20 print:text-[9px]">
            社印
          </div>
          <div className="mt-2 leading-6 print:leading-4">
            <p className="font-semibold text-slate-950">JVクリーニング</p>
            <p>〒951-8053</p>
            <p>新潟県新潟市中央区川端町2-12</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-b border-slate-200 pb-6 md:grid-cols-[1fr_320px] print:mt-5 print:grid-cols-[1fr_240px]">
        <p className="text-sm leading-7 text-slate-700 print:text-xs print:leading-5">下記の通りご請求申し上げます。</p>
        <div className="bg-slate-50 px-5 py-4 print:px-3 print:py-2">
          <p className="text-sm font-semibold text-slate-600 print:text-[10px]">ご請求金額</p>
          <p className="mt-2 text-3xl font-bold print:text-xl">{formatCurrencyJPY(total)}</p>
        </div>
      </div>

      {storeBlocks ? (
        <StoreInvoiceBlocks blocks={storeBlocks} summary={summary} />
      ) : (
        <SimpleInvoiceDetails details={details} summary={summary} total={total} />
      )}

      <div className="mt-8 border border-slate-300 p-4 text-sm print:mt-5 print:p-3 print:text-[10px]">
        <p className="font-bold">備考</p>
        <p className="mt-3 min-h-12 text-slate-600 print:mt-2">
          {selectedCustomer?.notes || "ご不明点がございましたらお問い合わせください。"}
        </p>
      </div>
    </div>
  );
}

function parseClosingDay(value: string): ClosingDay {
  if (value === "10") return 10;
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

function buildPeriodLabel(targetMonth: string) {
  const month = parseTargetMonth(targetMonth);
  if (!month) return `${targetMonth}-01 から月末`;
  return `${formatDate(month.year, month.month, 1)} から ${formatDate(month.year, month.month, lastDayOfMonth(month.year, month.month))}`;
}

function calculatePaymentDueDate(targetMonth: string, closingDay: ClosingDay) {
  const month = parseTargetMonth(targetMonth);
  if (!month) return "";
  const next = addMonths(month.year, month.month, 1);
  if (closingDay === "endOfMonth") {
    return formatDate(next.year, next.month, lastDayOfMonth(next.year, next.month));
  }
  return formatDate(next.year, next.month, closingDay - 1);
}

function parseTargetMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function addMonths(year: number, month: number, amount: number) {
  const date = new Date(year, month - 1 + amount, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDayLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${Number(match[2])}/${Number(match[3])}` : value;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
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

type StatementTable = {
  dates: string[];
  rows: StatementTableRow[];
};

type StatementTableRow = {
  key: string;
  storeKey: string;
  storeName: string;
  itemName: string;
  unitPrice: number;
  quantities: Record<string, number>;
  totalQuantity: number;
  amount: number;
  isFirstStoreRow: boolean;
};

function buildStatementTable(details: SalesDetail[], apiRows: DeliveryRow[] | null): StatementTable {
  const sourceRows = apiRows
    ? apiRows.map((row) => ({
        storeId: Number(row.store_id),
        deliveryDate: row.delivery_date,
        storeName: row.store_name || `店舗ID: ${row.store_id}`,
        itemName: row.item_name,
        unitPrice: Number(row.unit_price),
        quantity: Number(row.quantity),
        amount: Number(row.amount),
      }))
    : details.map((detail) => ({
        storeId: 0,
        deliveryDate: detail.deliveryDate,
        storeName: "-",
        itemName: detail.productName,
        unitPrice: detail.unitPrice,
        quantity: detail.quantity,
        amount: detail.amount,
      }));
  const dates = Array.from(new Set(sourceRows.map((row) => row.deliveryDate))).sort((a, b) => a.localeCompare(b));
  const grouped = new Map<string, StatementTableRow>();
  const storeOrder = new Map<string, number>();

  sourceRows.forEach((row) => {
    const storeKey = `${row.storeId}|${row.storeName}`;
    if (!storeOrder.has(storeKey)) {
      storeOrder.set(storeKey, storeOrder.size);
    }
    const key = `${row.storeName}|${row.itemName}|${row.unitPrice}`;
    const current = grouped.get(key) ?? {
      key,
      storeKey,
      storeName: row.storeName,
      itemName: row.itemName,
      unitPrice: row.unitPrice,
      quantities: {},
      totalQuantity: 0,
      amount: 0,
      isFirstStoreRow: false,
    };
    current.quantities[row.deliveryDate] = (current.quantities[row.deliveryDate] ?? 0) + row.quantity;
    current.totalQuantity += row.quantity;
    current.amount += row.amount;
    grouped.set(key, current);
  });

  let previousStore = "";
  const rows = Array.from(grouped.values())
    .sort((a, b) => (
      (storeOrder.get(a.storeKey) ?? 0) - (storeOrder.get(b.storeKey) ?? 0) ||
      a.itemName.localeCompare(b.itemName)
    ))
    .map((row) => {
      const isFirstStoreRow = row.storeName !== previousStore;
      previousStore = row.storeName;
      return { ...row, isFirstStoreRow };
    });

  return { dates, rows };
}

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

function InvoiceSummaryBox({ summary, fallbackTotal }: { summary: InvoiceSummary | null; fallbackTotal?: number }) {
  if (!summary) {
    if (fallbackTotal === undefined) return null;
    return (
      <div className="mt-6 ml-auto w-full max-w-sm space-y-1 text-sm print:mt-4 print:max-w-xs print:text-[10px]">
        <SummaryLine label="税込合計" value={fallbackTotal} strong />
      </div>
    );
  }
  return (
    <div className="mt-6 ml-auto w-full max-w-sm space-y-1 text-sm print:mt-4 print:max-w-xs print:text-[10px]">
      <SummaryLine label="商品合計" value={summary.product_total} />
      <SummaryLine label="配達料" value={summary.delivery_fee_total} />
      <SummaryLine label="回収・その他" value={summary.other_fee_total} />
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
    invoiceDeliveryMethods: ["gmail_pdf" as const],
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
