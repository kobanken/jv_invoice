import type { CollectionStatus } from "@/types";

export function calculateCashCollectionDifference(invoiceAmount: number, collectedAmount: number) {
  return collectedAmount - invoiceAmount;
}

export function resolveCashCollectionStatus(invoiceAmount: number, collectedAmount: number): CollectionStatus {
  const difference = calculateCashCollectionDifference(invoiceAmount, collectedAmount);
  if (collectedAmount === 0) return "not_collected";
  if (difference === 0) return "collected";
  if (difference < 0) return "partial";
  return "over_collected";
}
