import type { BankCustomer, Invoice, PaymentCandidate, PaymentRecord } from "@/types";

export function matchPaymentCandidates(
  paymentRecord: PaymentRecord,
  invoices: Invoice[],
  customers: BankCustomer[],
): PaymentCandidate[] {
  const normalizedName = paymentRecord.transferName.replace(/\s/g, "").toUpperCase();
  const paymentDate = new Date(paymentRecord.paymentDate);

  return invoices
    .filter((invoice) => invoice.customerType === "bank" && invoice.paymentStatus !== "paid")
    .map((invoice) => {
      const customer = customers.find((item) => item.customerId === invoice.customerId);
      if (!customer) return undefined;

      const transferNames = [
        customer.bankTransferName1,
        customer.bankTransferName2 ?? "",
        customer.bankTransferName3 ?? "",
      ].map((name) => name.replace(/\s/g, "").toUpperCase());
      const reasons: string[] = [];
      let score = 0;

      if (transferNames.some((name) => name && normalizedName.includes(name))) {
        score += 60;
        reasons.push("振込名義が一致");
      }
      if (invoice.invoiceAmount === paymentRecord.amount) {
        score += 30;
        reasons.push("請求金額が一致");
      } else {
        const difference = Math.abs(invoice.invoiceAmount - paymentRecord.amount);
        if (difference <= 1000) {
          score += 12;
          reasons.push("請求金額に近い");
        }
      }
      if (invoice.paymentStatus === "unpaid") {
        score += 10;
        reasons.push("未入金請求");
      }
      const dueDate = new Date(invoice.dueDate);
      const diffDays = Math.abs((paymentDate.getTime() - dueDate.getTime()) / 86_400_000);
      if (Number.isFinite(diffDays) && diffDays <= 14) {
        score += 8;
        reasons.push("支払期限が近い");
      }

      return { customer, invoice, score, reasons };
    })
    .filter((candidate): candidate is PaymentCandidate => {
      return candidate !== undefined && candidate.score > 0;
    })
    .sort((a, b) => b.score - a.score);
}
