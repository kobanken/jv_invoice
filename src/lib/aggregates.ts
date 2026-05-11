import type { CustomerType, Invoice, InvoiceDeliveryMethod, UserRole } from "@/types";
import { getUndeliveredInvoices, getUnpaidInvoices } from "@/lib/invoices";
import { canSeeCustomerType } from "@/config/permissions";

export function filterInvoicesByMonth(invoices: Invoice[], targetMonth: string) {
  return invoices.filter((invoice) => invoice.targetMonth === targetMonth);
}

export function sumInvoices(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + invoice.invoiceAmount, 0);
}

export function countByDeliveryMethod(invoices: Invoice[], method: InvoiceDeliveryMethod) {
  return invoices.filter((invoice) => invoice.deliveryMethod === method).length;
}

export function filterInvoicesByRole(
  bankInvoices: Invoice[],
  cashInvoices: Invoice[],
  targetMonth: string,
  role: UserRole,
) {
  const bank = filterInvoicesByMonth(bankInvoices, targetMonth);
  const cash = filterInvoicesByMonth(cashInvoices, targetMonth);
  return {
    bank: canSeeCustomerType(role, "bank") ? bank : [],
    cash: canSeeCustomerType(role, "cash") ? cash : [],
  };
}

export function getVisibleTotalLabel(role: UserRole, customerType: CustomerType) {
  if (role === "viewer") return customerType === "bank" ? "区分A合計" : "区分B合計";
  return customerType === "bank" ? "振込合計" : "現金合計";
}

export function buildDashboardMetrics(
  bankInvoices: Invoice[],
  cashInvoices: Invoice[],
  targetMonth: string,
  role: UserRole,
) {
  const { bank, cash } = filterInvoicesByRole(bankInvoices, cashInvoices, targetMonth, role);
  const all = [...bank, ...cash];

  return {
    showBank: canSeeCustomerType(role, "bank"),
    showCash: canSeeCustomerType(role, "cash"),
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
