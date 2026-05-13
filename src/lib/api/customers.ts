"use client";

import { useEffect, useState } from "react";
import type { ApiCustomer, ApiStore, PaymentType } from "@/types/api";
import type { BankCustomer, CashCustomer, ClosingDay, Customer, CustomerType } from "@/types";
import { apiGet } from "@/lib/api/client";

const paymentTypeByCustomerType: Record<CustomerType, PaymentType> = {
  bank: "bank_transfer",
  cash: "cash",
};

export function useLiveCustomers(customerType?: CustomerType, initialCustomers: Customer[] = []) {
  const [customers, setCustomers] = useState<Customer[]>(() => filterCustomersByType(initialCustomers, customerType));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setLoading(true);
      setError("");
      try {
        const paymentType = customerType ? paymentTypeByCustomerType[customerType] : undefined;
        const apiCustomers = await apiGet<ApiCustomer[]>(
          "/customers.php",
          paymentType ? { payment_type: paymentType } : undefined,
        );
        const apiStores = await apiGet<ApiStore[]>("/stores.php").catch(() => []);
        if (!cancelled) {
          setCustomers(filterCustomersByType(mapApiCustomersToCustomers(apiCustomers, apiStores), customerType));
        }
      } catch (exception) {
        if (!cancelled) {
          setCustomers(filterCustomersByType(initialCustomers, customerType));
          setError(exception instanceof Error ? exception.message : "顧客マスタの取得に失敗しました。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [customerType, initialCustomers]);

  return { customers, loading, error };
}

export function mapApiCustomersToCustomers(apiCustomers: ApiCustomer[], apiStores: ApiStore[] = []): Customer[] {
  const storeNamesByCustomerId = new Map<number, string>();
  apiStores.forEach((store) => {
    const current = storeNamesByCustomerId.get(store.customer_id);
    storeNamesByCustomerId.set(store.customer_id, current ? `${current}、${store.name}` : store.name);
  });

  return apiCustomers.map((customer) => {
    const base = {
      customerId: customer.customer_code,
      storeName: storeNamesByCustomerId.get(customer.id) ?? "未登録",
      billingName: customer.name,
      closingDay: toClosingDay(customer.closing_day),
      invoiceDeliveryMethod: customer.delivery_method,
      email: customer.email ?? "",
      postalAddress: [customer.postal_code, customer.address].filter(Boolean).join(" "),
      isLineTarget: customer.delivery_method === "line",
      notes: customer.note ?? "",
      isActive: true,
    };

    if (customer.payment_type === "cash") {
      return {
        ...base,
        customerType: "cash",
        collectionStaff: "-",
        collectionMethod: "現金",
        collectionMemo: customer.note ?? "",
      } satisfies CashCustomer;
    }

    return {
      ...base,
      customerType: "bank",
      bankTransferName1: customer.bank_transfer_name || customer.name,
      paymentCheckMemo: customer.note ?? "",
    } satisfies BankCustomer;
  });
}

function filterCustomersByType(customers: Customer[], customerType?: CustomerType) {
  return customerType ? customers.filter((customer) => customer.customerType === customerType) : customers;
}

function toClosingDay(value: number): ClosingDay {
  if (value === 15) return 15;
  if (value === 20) return 20;
  return "endOfMonth";
}
