import type { ClosingDay, Invoice, InvoiceDeliveryMethod } from "@/types";
import type { ApiDeliveryMethod, SavedInvoiceSummary } from "@/types/api";

export function summaryToInvoice(summary: SavedInvoiceSummary): Invoice {
  const customerType = summary.payment_type === "bank_transfer" ? "bank" : "cash";
  const closingDay = summary.closing_day === 31 ? "endOfMonth" : summary.closing_day as ClosingDay;
  const deliveryMethods = normalizeSummaryDeliveryMethods(summary.delivery_methods, summary.delivery_method);
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
    closingDay,
    invoiceAmount: Number(summary.total),
    deliveryMethod: deliveryMethods[0],
    deliveryMethods,
    issueStatus: summary.issue_status ?? "not_issued",
    deliveryStatus: summary.delivery_status ?? "not_delivered",
    paymentStatus: summary.payment_status ?? "unpaid",
    issueDate: summary.issue_date ?? undefined,
    deliveryDate: summary.delivery_date ?? undefined,
    paymentDate: summary.payment_date ?? undefined,
    dueDate: calculatePaymentDueDate(summary.billing_month, closingDay),
    statusNote: summary.status_note ?? undefined,
    notes: summary.status_note ?? "",
  };
}

export function normalizeSummaryDeliveryMethods(
  value: SavedInvoiceSummary["delivery_methods"],
  fallback: ApiDeliveryMethod,
): InvoiceDeliveryMethod[] {
  const rawMethods = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const methods = rawMethods
    .map((method) => method.trim())
    .filter((method): method is InvoiceDeliveryMethod => isInvoiceDeliveryMethod(method));
  return methods.length > 0 ? methods : [fallback];
}

function isInvoiceDeliveryMethod(value: string): value is InvoiceDeliveryMethod {
  return ["gmail_pdf", "fax", "line", "hand_delivery", "postal"].includes(value);
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
