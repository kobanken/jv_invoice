import type { CashCollectionRecord, CashCustomer, CustomerPrice, Invoice, SalesDetail } from "@/types";

export const cashCustomers: CashCustomer[] = [
  {
    customerId: "C001",
    customerType: "cash",
    storeName: "中野理容室",
    billingName: "中野理容室",
    closingDay: "endOfMonth",
    invoiceDeliveryMethod: "hand_delivery",
    email: "",
    postalAddress: "東京都中野区中野1-2-3",
    isLineTarget: false,
    notes: "集金は月初",
    isActive: true,
    collectionStaff: "佐藤",
    collectionMethod: "訪問集金",
    collectionMemo: "午前中希望"
  },
  {
    customerId: "C002",
    customerType: "cash",
    storeName: "高円寺カフェ",
    billingName: "高円寺カフェ",
    closingDay: 20,
    invoiceDeliveryMethod: "line",
    email: "",
    postalAddress: "東京都杉並区高円寺4-5-6",
    isLineTarget: true,
    notes: "LINEで金額連絡",
    isActive: true,
    collectionStaff: "田中",
    collectionMethod: "店頭受取",
    collectionMemo: ""
  }
];

export const cashCustomerPrices: CustomerPrice[] = [
  { customerId: "C001", productId: "P001", unitPrice: 19, validFromMonth: "2026-01", notes: "" },
  { customerId: "C001", productId: "P002", unitPrice: 32, validFromMonth: "2026-01", notes: "" },
  { customerId: "C002", productId: "P001", unitPrice: 21, validFromMonth: "2026-01", notes: "" },
  { customerId: "C002", productId: "P004", unitPrice: 500, validFromMonth: "2026-01", notes: "" }
];

export const cashSalesDetails: SalesDetail[] = [
  { salesId: "SC001-001", customerId: "C001", customerType: "cash", deliveryDate: "2026-05-11", productId: "P001", productName: "おしぼり", unitPrice: 19, quantity: 260, amount: 4940, targetMonth: "2026-05", closingDay: "endOfMonth", notes: "", createdAt: "2026-05-11", updatedAt: "2026-05-11" },
  { salesId: "SC001-002", customerId: "C001", customerType: "cash", deliveryDate: "2026-05-21", productId: "P002", productName: "タオル", unitPrice: 32, quantity: 60, amount: 1920, targetMonth: "2026-05", closingDay: "endOfMonth", notes: "", createdAt: "2026-05-21", updatedAt: "2026-05-21" },
  { salesId: "SC002-001", customerId: "C002", customerType: "cash", deliveryDate: "2026-05-14", productId: "P001", productName: "おしぼり", unitPrice: 21, quantity: 180, amount: 3780, targetMonth: "2026-05", closingDay: 20, notes: "", createdAt: "2026-05-14", updatedAt: "2026-05-14" },
  { salesId: "SC002-002", customerId: "C002", customerType: "cash", deliveryDate: "2026-05-20", productId: "P004", productName: "送料", unitPrice: 500, quantity: 1, amount: 500, targetMonth: "2026-05", closingDay: 20, notes: "", createdAt: "2026-05-20", updatedAt: "2026-05-20" }
];

export const cashInvoices: Invoice[] = [
  { invoiceId: "C-202605-C001", customerId: "C001", customerType: "cash", storeName: "中野理容室", targetMonth: "2026-05", closingDay: "endOfMonth", invoiceAmount: 6860, deliveryMethod: "hand_delivery", issueStatus: "issued", deliveryStatus: "delivered", paymentStatus: "partial", issueDate: "2026-06-01", dueDate: "2026-06-10", pdfUrl: "", notes: "" },
  { invoiceId: "C-202605-C002", customerId: "C002", customerType: "cash", storeName: "高円寺カフェ", targetMonth: "2026-05", closingDay: 20, invoiceAmount: 4280, deliveryMethod: "line", issueStatus: "issued", deliveryStatus: "not_delivered", paymentStatus: "unpaid", issueDate: "2026-05-21", dueDate: "2026-06-05", pdfUrl: "", notes: "" }
];

export const cashCollectionRecords: CashCollectionRecord[] = [
  { collectionId: "COL001", customerId: "C001", invoiceId: "C-202605-C001", targetMonth: "2026-05", invoiceAmount: 6860, collectedAmount: 6000, difference: -860, collectionDate: "2026-06-03", collectionStaff: "佐藤", status: "partial", notes: "不足分は次回" },
  { collectionId: "COL002", customerId: "C002", invoiceId: "C-202605-C002", targetMonth: "2026-05", invoiceAmount: 4280, collectedAmount: 0, difference: -4280, collectionDate: "", collectionStaff: "田中", status: "not_collected", notes: "" }
];
