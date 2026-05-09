import type { UserRole } from "@/types";

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
