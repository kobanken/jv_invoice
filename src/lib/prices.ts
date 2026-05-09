import type { CustomerPrice } from "@/types";

export function getCustomerPrice(
  prices: CustomerPrice[],
  customerId: string,
  productId: string,
  targetMonth: string,
) {
  return prices
    .filter((price) => {
      const startsBefore = price.validFromMonth <= targetMonth;
      const endsAfter = !price.validToMonth || price.validToMonth >= targetMonth;
      return price.customerId === customerId && price.productId === productId && startsBefore && endsAfter;
    })
    .sort((a, b) => b.validFromMonth.localeCompare(a.validFromMonth))[0];
}
