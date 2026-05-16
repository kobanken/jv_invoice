import type { ApiDeliveryMethod, PaymentType, PriceCategory } from "@/types/api";

export function formatPaymentType(value: PaymentType) {
  return value === "cash" ? "現金" : "振込";
}

export function formatApiDeliveryMethod(value: ApiDeliveryMethod) {
  const labels: Record<ApiDeliveryMethod, string> = {
    gmail_pdf: "Gmail PDF",
    line: "LINE",
    hand_delivery: "手渡し",
    postal: "郵送",
  };
  return labels[value];
}

export function formatPriceCategory(value: PriceCategory) {
  const labels: Record<PriceCategory, string> = {
    product: "商品",
    delivery_fee: "配達料",
    collection: "回収",
    other_fee: "その他手数料",
  };
  return labels[value];
}

export function formatApiClosingDay(value: number) {
  return value === 31 ? "月末" : `${value}日`;
}
