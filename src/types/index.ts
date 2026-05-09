export type CustomerType = "bank" | "cash";
export type InvoiceDeliveryMethod = "gmail_pdf" | "line" | "hand_delivery" | "postal";
export type ClosingDay = 15 | 20 | "endOfMonth";
export type PaymentMethod = "bank_transfer" | "cash";
export type InvoiceStatus = "not_issued" | "issued";
export type DeliveryStatus = "not_delivered" | "delivered";
export type PaymentStatus = "unpaid" | "paid" | "partial" | "overpaid";
export type MatchStatus = "unmatched" | "candidate" | "matched";
export type CollectionStatus = "not_collected" | "collected" | "partial" | "over_collected";
export type UserRole = "admin" | "bank_staff" | "cash_staff" | "viewer";

export type BaseCustomer = {
  customerId: string;
  customerType: CustomerType;
  storeName: string;
  billingName: string;
  closingDay: ClosingDay;
  invoiceDeliveryMethod: InvoiceDeliveryMethod;
  email: string;
  postalAddress: string;
  isLineTarget: boolean;
  notes: string;
  isActive: boolean;
};

export type BankCustomer = BaseCustomer & {
  customerType: "bank";
  bankTransferName1: string;
  bankTransferName2?: string;
  bankTransferName3?: string;
  paymentCheckMemo: string;
};

export type CashCustomer = BaseCustomer & {
  customerType: "cash";
  collectionStaff: string;
  collectionMethod: string;
  collectionMemo: string;
};

export type Customer = BankCustomer | CashCustomer;

export type Product = {
  productId: string;
  productName: string;
  displayOrder: number;
  isRegularProduct: boolean;
  isFee: boolean;
  notes: string;
  isActive: boolean;
};

export type CustomerPrice = {
  customerId: string;
  productId: string;
  unitPrice: number;
  validFromMonth: string;
  validToMonth?: string;
  notes: string;
};

export type SalesDetail = {
  salesId: string;
  customerId: string;
  customerType: CustomerType;
  deliveryDate: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  targetMonth: string;
  closingDay: ClosingDay;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  invoiceId: string;
  customerId: string;
  customerType: CustomerType;
  storeName: string;
  targetMonth: string;
  closingDay: ClosingDay;
  invoiceAmount: number;
  deliveryMethod: InvoiceDeliveryMethod;
  issueStatus: InvoiceStatus;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  issueDate?: string;
  dueDate: string;
  pdfUrl?: string;
  notes: string;
};

export type PaymentRecord = {
  paymentId: string;
  paymentCheckDate: string;
  paymentDate: string;
  transferName: string;
  amount: number;
  candidateCustomerId?: string;
  candidateInvoiceId?: string;
  matchStatus: MatchStatus;
  notes: string;
};

export type CashCollectionRecord = {
  collectionId: string;
  customerId: string;
  invoiceId: string;
  targetMonth: string;
  invoiceAmount: number;
  collectedAmount: number;
  difference: number;
  collectionDate?: string;
  collectionStaff: string;
  status: CollectionStatus;
  notes: string;
};

export type PaymentCandidate = {
  customer: BankCustomer;
  invoice: Invoice;
  score: number;
  reasons: string[];
};
