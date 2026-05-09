import type { CustomerType } from "@/types";

export function generateCustomerId(type: CustomerType, sequence = 1) {
  const prefix = type === "bank" ? "B" : "C";
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export function generateInvoiceId(customerType: CustomerType, targetMonth: string, customerId: string) {
  const prefix = customerType === "bank" ? "B" : "C";
  return `${prefix}-${targetMonth.replace("-", "")}-${customerId}`;
}
