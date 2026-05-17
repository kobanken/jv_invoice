"use client";

import { useEffect, useState } from "react";
import type { ApiCustomer, ApiDeliveryMethod, ApiStore, PaymentType } from "@/types/api";
import type { BankCustomer, CashCustomer, ClosingDay, Customer, CustomerType, InvoiceDeliveryMethod } from "@/types";
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
    const deliveryMethods = normalizeApiDeliveryMethods(customer.delivery_methods, customer.delivery_method);
    const base = {
      sourceApiCustomerId: customer.id,
      customerId: customer.customer_code,
      storeName: storeNamesByCustomerId.get(customer.id) ?? "未登録",
      billingName: customer.name,
      closingDay: toClosingDay(customer.closing_day),
      invoiceDeliveryMethod: deliveryMethods[0],
      invoiceDeliveryMethods: deliveryMethods,
      email: customer.email ?? "",
      postalAddress: [customer.postal_code, customer.address].filter(Boolean).join(" "),
      isLineTarget: deliveryMethods.includes("line"),
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

    const bankTransferNames = splitBankTransferNames(customer.bank_transfer_name);
    return {
      ...base,
      customerType: "bank",
      bankTransferName1: bankTransferNames[0] || customer.name,
      bankTransferName2: bankTransferNames[1],
      bankTransferName3: bankTransferNames.slice(2).join(", ") || undefined,
      paymentCheckMemo: customer.note ?? "",
    } satisfies BankCustomer;
  });
}

export function splitBankTransferNames(value?: string | null) {
  return (value ?? "")
    .split(/[,\u3001]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function filterCustomersByType(customers: Customer[], customerType?: CustomerType) {
  return customerType ? customers.filter((customer) => customer.customerType === customerType) : customers;
}

function toClosingDay(value: number): ClosingDay {
  if (value === 10) return 10;
  if (value === 15) return 15;
  if (value === 20) return 20;
  return "endOfMonth";
}

function normalizeApiDeliveryMethods(
  value: ApiCustomer["delivery_methods"],
  fallback: ApiDeliveryMethod,
): InvoiceDeliveryMethod[] {
  const rawMethods = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const methods = rawMethods
    .map((method) => method.trim())
    .filter((method): method is InvoiceDeliveryMethod => isInvoiceDeliveryMethod(method));
  return methods.length > 0 ? methods : [fallback];
}

function isInvoiceDeliveryMethod(value: string): value is InvoiceDeliveryMethod {
  return ["gmail_pdf", "fax", "line", "hand_delivery", "postal"].includes(value);
}
