import type { BankCustomer, CustomerPrice, Invoice, PaymentRecord, SalesDetail } from "@/types";

export const bankCustomers: BankCustomer[] = [
  {
    customerId: "B001",
    customerType: "bank",
    storeName: "青山サロン",
    billingName: "株式会社青山サロン",
    closingDay: "endOfMonth",
    invoiceDeliveryMethod: "gmail_pdf",
    email: "billing-aoyama@example.com",
    postalAddress: "東京都港区南青山1-1-1",
    isLineTarget: false,
    notes: "月末締め。PDF送付。",
    isActive: true,
    bankTransferName1: "カ）アオヤマサロン",
    bankTransferName2: "アオヤマサロン",
    bankTransferName3: "",
    paymentCheckMemo: "名義ゆれあり"
  },
  {
    customerId: "B002",
    customerType: "bank",
    storeName: "銀座スパ",
    billingName: "銀座スパ合同会社",
    closingDay: 20,
    invoiceDeliveryMethod: "line",
    email: "",
    postalAddress: "東京都中央区銀座2-2-2",
    isLineTarget: true,
    notes: "LINE送付",
    isActive: true,
    bankTransferName1: "ギンザスパ",
    bankTransferName2: "",
    bankTransferName3: "",
    paymentCheckMemo: "20日締め"
  },
  {
    customerId: "B003",
    customerType: "bank",
    storeName: "渋谷整体院",
    billingName: "渋谷整体院",
    closingDay: 15,
    invoiceDeliveryMethod: "postal",
    email: "info-shibuya@example.com",
    postalAddress: "東京都渋谷区道玄坂3-3-3",
    isLineTarget: false,
    notes: "紙請求書",
    isActive: true,
    bankTransferName1: "シブヤセイタイイン",
    bankTransferName2: "",
    bankTransferName3: "",
    paymentCheckMemo: ""
  }
];

export const bankCustomerPrices: CustomerPrice[] = [
  { customerId: "B001", productId: "P001", unitPrice: 18, validFromMonth: "2026-01", notes: "" },
  { customerId: "B001", productId: "P002", unitPrice: 35, validFromMonth: "2026-01", notes: "" },
  { customerId: "B001", productId: "P004", unitPrice: 800, validFromMonth: "2026-01", notes: "" },
  { customerId: "B002", productId: "P001", unitPrice: 20, validFromMonth: "2026-01", notes: "" },
  { customerId: "B002", productId: "P003", unitPrice: 85, validFromMonth: "2026-01", notes: "" },
  { customerId: "B003", productId: "P002", unitPrice: 38, validFromMonth: "2026-01", notes: "" },
  { customerId: "B003", productId: "P005", unitPrice: 220, validFromMonth: "2026-01", notes: "" }
];

export const bankSalesDetails: SalesDetail[] = [
  { salesId: "SB001-001", customerId: "B001", customerType: "bank", deliveryDate: "2026-05-10", productId: "P001", productName: "おしぼり", unitPrice: 18, quantity: 400, amount: 7200, targetMonth: "2026-05", closingDay: "endOfMonth", notes: "", createdAt: "2026-05-10", updatedAt: "2026-05-10" },
  { salesId: "SB001-002", customerId: "B001", customerType: "bank", deliveryDate: "2026-05-20", productId: "P002", productName: "タオル", unitPrice: 35, quantity: 80, amount: 2800, targetMonth: "2026-05", closingDay: "endOfMonth", notes: "", createdAt: "2026-05-20", updatedAt: "2026-05-20" },
  { salesId: "SB001-003", customerId: "B001", customerType: "bank", deliveryDate: "2026-05-31", productId: "P004", productName: "送料", unitPrice: 800, quantity: 1, amount: 800, targetMonth: "2026-05", closingDay: "endOfMonth", notes: "", createdAt: "2026-05-31", updatedAt: "2026-05-31" },
  { salesId: "SB002-001", customerId: "B002", customerType: "bank", deliveryDate: "2026-05-12", productId: "P001", productName: "おしぼり", unitPrice: 20, quantity: 300, amount: 6000, targetMonth: "2026-05", closingDay: 20, notes: "", createdAt: "2026-05-12", updatedAt: "2026-05-12" },
  { salesId: "SB002-002", customerId: "B002", customerType: "bank", deliveryDate: "2026-05-15", productId: "P003", productName: "バスタオル", unitPrice: 85, quantity: 30, amount: 2550, targetMonth: "2026-05", closingDay: 20, notes: "", createdAt: "2026-05-15", updatedAt: "2026-05-15" },
  { salesId: "SB003-001", customerId: "B003", customerType: "bank", deliveryDate: "2026-05-08", productId: "P002", productName: "タオル", unitPrice: 38, quantity: 120, amount: 4560, targetMonth: "2026-05", closingDay: 15, notes: "", createdAt: "2026-05-08", updatedAt: "2026-05-08" },
  { salesId: "SB003-002", customerId: "B003", customerType: "bank", deliveryDate: "2026-05-15", productId: "P005", productName: "紙請求書発行手数料", unitPrice: 220, quantity: 1, amount: 220, targetMonth: "2026-05", closingDay: 15, notes: "", createdAt: "2026-05-15", updatedAt: "2026-05-15" }
];

export const bankInvoices: Invoice[] = [
  { invoiceId: "B-202605-B001", customerId: "B001", customerType: "bank", storeName: "青山サロン", targetMonth: "2026-05", closingDay: "endOfMonth", invoiceAmount: 10800, deliveryMethod: "gmail_pdf", issueStatus: "issued", deliveryStatus: "delivered", paymentStatus: "unpaid", issueDate: "2026-06-01", dueDate: "2026-06-30", pdfUrl: "", notes: "" },
  { invoiceId: "B-202605-B002", customerId: "B002", customerType: "bank", storeName: "銀座スパ", targetMonth: "2026-05", closingDay: 20, invoiceAmount: 8550, deliveryMethod: "line", issueStatus: "issued", deliveryStatus: "not_delivered", paymentStatus: "unpaid", issueDate: "2026-05-21", dueDate: "2026-06-20", pdfUrl: "", notes: "" },
  { invoiceId: "B-202605-B003", customerId: "B003", customerType: "bank", storeName: "渋谷整体院", targetMonth: "2026-05", closingDay: 15, invoiceAmount: 4780, deliveryMethod: "postal", issueStatus: "not_issued", deliveryStatus: "not_delivered", paymentStatus: "unpaid", issueDate: "", dueDate: "2026-06-15", pdfUrl: "", notes: "" }
];

export const bankPaymentRecords: PaymentRecord[] = [
  { paymentId: "PAY001", paymentCheckDate: "2026-06-03", paymentDate: "2026-06-03", transferName: "カ）アオヤマサロン", amount: 10800, candidateCustomerId: "B001", candidateInvoiceId: "B-202605-B001", matchStatus: "candidate", notes: "候補一致" }
];
