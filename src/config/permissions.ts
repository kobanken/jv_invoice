import type { CustomerType, UserRole } from "@/types";

export const currentUserRole: UserRole = "admin";

export const rolePermissions: Record<UserRole, string[]> = {
  admin: ["dashboard", "bank", "cash", "master", "monthly", "invoicePreview"],
  bank_staff: ["dashboard", "bank", "master", "monthly", "invoicePreview"],
  cash_staff: ["dashboard", "cash", "master", "monthly", "invoicePreview"],
  viewer: ["dashboard", "monthly", "invoicePreview"],
};

export function canAccess(role: UserRole, permission: string) {
  return rolePermissions[role].includes(permission);
}

export function visibleCustomerTypesForRole(role: UserRole): CustomerType[] {
  if (role === "bank_staff") return ["bank"];
  if (role === "cash_staff") return ["cash"];
  return ["bank", "cash"];
}

export function canSeeCustomerType(role: UserRole, customerType: CustomerType) {
  return visibleCustomerTypesForRole(role).includes(customerType);
}
