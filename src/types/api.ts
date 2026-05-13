export type PaymentType = "bank_transfer" | "cash";
export type ApiDeliveryMethod = "gmail_pdf" | "line" | "hand_delivery" | "postal";
export type PriceCategory = "product" | "delivery_fee" | "other_fee";

export type ApiCustomer = {
  id: number;
  customer_code: string;
  name: string;
  honorific: string;
  payment_type: PaymentType;
  delivery_method: ApiDeliveryMethod;
  closing_day: number;
  postal_code: string | null;
  address: string | null;
  email: string | null;
  line_name: string | null;
  bank_transfer_name: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiStore = {
  id: number;
  customer_id: number;
  name: string;
  display_order: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ApiPrice = {
  id: number;
  customer_id: number;
  store_id: number | null;
  item_name: string;
  unit_price: number;
  category: PriceCategory;
  start_date: string;
  end_date: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DeliveryRow = {
  header_id: number;
  customer_id: number;
  store_id: number;
  billing_month: string;
  delivery_date: string;
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  category: PriceCategory;
  header_note: string | null;
  item_note: string | null;
};

export type HorizontalDeliveryItem = {
  item_name: string;
  unit_price: number;
  category: PriceCategory;
  quantities: Record<string, number>;
  total_quantity: number;
  amount: number;
};

export type DeliveryListResponse = {
  rows: DeliveryRow[];
  horizontal: {
    delivery_dates: string[];
    items: HorizontalDeliveryItem[];
  };
  summary: InvoiceSummary;
};

export type InvoiceSummary = {
  customer_id?: number;
  billing_month?: string;
  payment_type?: PaymentType;
  delivery_method?: ApiDeliveryMethod;
  product_total: number;
  delivery_fee_total: number;
  other_fee_total: number;
  subtotal: number;
  tax: number;
  total: number;
  tax_rate?: number;
};
