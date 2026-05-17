import type { ClosingDay, InvoiceDeliveryMethod, PaymentStatus } from "@/types";

export function formatCurrencyJPY(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTargetMonth(date: string | Date) {
  const value = typeof date === "string" ? new Date(`${date}-01`) : date;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatClosingDay(closingDay: ClosingDay) {
  if (closingDay === "endOfMonth") return "月末締め";
  return `${closingDay}日締め`;
}

export function formatDeliveryMethod(method: InvoiceDeliveryMethod) {
  const labels: Record<InvoiceDeliveryMethod, string> = {
    gmail_pdf: "PDF",
    fax: "FAX",
    line: "LINE",
    hand_delivery: "手渡し",
    postal: "郵送",
  };
  return labels[method];
}

export function formatDeliveryMethods(methods: readonly InvoiceDeliveryMethod[]) {
  return methods.map(formatDeliveryMethod).join(" / ");
}

export function formatPaymentStatus(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    unpaid: "未入金/未集金",
    paid: "完了",
    partial: "一部",
    overpaid: "過入金",
  };
  return labels[status];
}
