import type { BankCustomer, Invoice, PaymentCandidate, PaymentCandidateScoreDetail, PaymentRecord } from "@/types";
import { splitBankTransferNames } from "@/lib/api/customers";

export function matchPaymentCandidates(
  paymentRecord: PaymentRecord,
  invoices: Invoice[],
  customers: BankCustomer[],
): PaymentCandidate[] {
  const normalizedName = normalizeTransferName(paymentRecord.transferName);
  const paymentDate = new Date(paymentRecord.paymentDate);
  const hasAmount = Number.isFinite(paymentRecord.amount) && paymentRecord.amount > 0;

  return invoices
    .filter((invoice) => invoice.customerType === "bank" && invoice.paymentStatus !== "paid")
    .map((invoice) => {
      const customer = customers.find((item) => item.customerId === invoice.customerId);
      if (!customer) return undefined;

      const transferNames = [
        customer.bankTransferName1,
        customer.bankTransferName2 ?? "",
        customer.bankTransferName3 ?? "",
        customer.billingName,
        customer.storeName,
        customer.customerId,
      ].flatMap((name) => splitBankTransferNames(name)).map(normalizeTransferName);
      const scoreDetails: PaymentCandidateScoreDetail[] = [];

      scoreDetails.push(calculateNameScore(normalizedName, transferNames));
      if (hasAmount && invoice.invoiceAmount === paymentRecord.amount) {
        scoreDetails.push({ label: "金額", score: 35, maxScore: 35 });
      } else if (hasAmount) {
        const difference = Math.abs(invoice.invoiceAmount - paymentRecord.amount);
        if (difference <= 1000) {
          scoreDetails.push({ label: "金額", score: Math.max(1, Math.round(20 * (1 - difference / 1000))), maxScore: 35 });
        } else {
          scoreDetails.push({ label: "金額", score: 0, maxScore: 35 });
        }
      } else {
        scoreDetails.push({ label: "金額", score: 0, maxScore: 35 });
      }

      scoreDetails.push(calculateDueDateScore(paymentDate, invoice.dueDate));
      if (invoice.paymentStatus === "unpaid") {
        scoreDetails.push({ label: "未入金", score: 10, maxScore: 10 });
      } else {
        scoreDetails.push({ label: "未入金", score: 0, maxScore: 10 });
      }

      const score = scoreDetails.reduce((sum, detail) => sum + detail.score, 0);
      if (score <= 0) return undefined;
      const reasons = scoreDetails
        .filter((detail) => detail.score > 0)
        .map((detail) => `${detail.label} ${detail.score}/${detail.maxScore}`);

      return { customer, invoice, score: clampCandidateScore(score), scoreDetails, reasons };
    })
    .filter((candidate): candidate is PaymentCandidate => {
      return candidate !== undefined;
    })
    .sort((a, b) => b.score - a.score);
}

function normalizeTransferName(value: string) {
  return value.normalize("NFKC").replace(/\s/g, "").toUpperCase();
}

function clampCandidateScore(score: number) {
  return Math.min(100, Math.max(1, score));
}

function calculateNameScore(
  normalizedPaymentName: string,
  transferNames: string[],
): PaymentCandidateScoreDetail {
  if (!normalizedPaymentName) {
    return { label: "名義", score: 0, maxScore: 40 };
  }

  const validNames = transferNames.filter(Boolean);
  if (validNames.some((name) => name === normalizedPaymentName)) {
    return { label: "名義", score: 40, maxScore: 40 };
  }
  if (validNames.some((name) => normalizedPaymentName.includes(name) || name.includes(normalizedPaymentName))) {
    return { label: "名義", score: 30, maxScore: 40 };
  }

  return { label: "名義", score: 0, maxScore: 40 };
}

function calculateDueDateScore(paymentDate: Date, dueDateValue: string): PaymentCandidateScoreDetail {
  const dueDate = new Date(dueDateValue);
  const diffDays = Math.abs((paymentDate.getTime() - dueDate.getTime()) / 86_400_000);
  if (!Number.isFinite(diffDays)) {
    return { label: "期限", score: 0, maxScore: 15 };
  }
  if (diffDays <= 7) {
    return { label: "期限", score: 15, maxScore: 15 };
  }
  if (diffDays <= 14) {
    return { label: "期限", score: 10, maxScore: 15 };
  }

  return { label: "期限", score: 0, maxScore: 15 };
}
