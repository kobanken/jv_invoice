import type { ClosingDay, Invoice, SalesDetail } from "@/types";

export function calculateSalesAmount(unitPrice: number, quantity: number) {
  return unitPrice * quantity;
}

export function calculateInvoiceTotal(salesDetails: SalesDetail[]) {
  return salesDetails.reduce((sum, detail) => sum + detail.amount, 0);
}

export function getInvoiceDetails(
  salesDetails: SalesDetail[],
  customerId: string,
  targetMonth: string,
  closingDay?: ClosingDay,
) {
  return salesDetails.filter((detail) => {
    const sameBase = detail.customerId === customerId && detail.targetMonth === targetMonth;
    return closingDay ? sameBase && detail.closingDay === closingDay : sameBase;
  });
}

export function getUnpaidInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.paymentStatus !== "paid");
}

export function getUndeliveredInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.deliveryStatus !== "delivered");
}
