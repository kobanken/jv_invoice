import type { Invoice, InvoiceDeliveryMethod } from "@/types";
import { getUndeliveredInvoices, getUnpaidInvoices } from "@/lib/invoices";

export function filterInvoicesByMonth(invoices: Invoice[], targetMonth: string) {
  return invoices.filter((invoice) => invoice.targetMonth === targetMonth);
}

export function sumInvoices(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.invoiceAmount, 0);
}

export function countByDeliveryMethod(invoices: Invoice[], method: InvoiceDeliveryMethod) {
  return invoices.filter((invoice) => invoice.deliveryMethod === method).length;
}

export function buildDashboardMetrics(bankInvoices: Invoice[], cashInvoices: Invoice[], targetMonth: string) {
  const bank = filterInvoicesByMonth(bankInvoices, targetMonth);
  const cash = filterInvoicesByMonth(cashInvoices, targetMonth);
  const all = [...bank, ...cash];

  return {
    bankTotal: sumInvoices(bank),
    cashTotal: sumInvoices(cash),
    total: sumInvoices(all),
    undeliveredCount: getUndeliveredInvoices(all).length,
    unpaidBankCount: getUnpaidInvoices(bank).length,
    uncollectedCashCount: getUnpaidInvoices(cash).length,
    gmailPdfCount: countByDeliveryMethod(all, "gmail_pdf"),
    lineCount: countByDeliveryMethod(all, "line"),
    postalCount: countByDeliveryMethod(all, "postal"),
    handDeliveryCount: countByDeliveryMethod(all, "hand_delivery"),
  };
}
