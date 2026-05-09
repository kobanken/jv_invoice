import type { Product } from "@/types";

export const products: Product[] = [
  { productId: "P001", productName: "おしぼり", displayOrder: 1, isRegularProduct: true, isFee: false, notes: "定番商品", isActive: true },
  { productId: "P002", productName: "タオル", displayOrder: 2, isRegularProduct: true, isFee: false, notes: "定番商品", isActive: true },
  { productId: "P003", productName: "バスタオル", displayOrder: 3, isRegularProduct: true, isFee: false, notes: "大型タオル", isActive: true },
  { productId: "P004", productName: "送料", displayOrder: 90, isRegularProduct: false, isFee: true, notes: "配送費", isActive: true },
  { productId: "P005", productName: "紙請求書発行手数料", displayOrder: 91, isRegularProduct: false, isFee: true, notes: "郵送/紙発行", isActive: true },
  { productId: "P999", productName: "その他", displayOrder: 99, isRegularProduct: false, isFee: false, notes: "個別調整", isActive: true }
];
