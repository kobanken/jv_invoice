import type { CustomerType, UserRole } from "@/types";

export type PermissionKey =
  | "dashboard"
  | "bank"
  | "cash"
  | "master"
  | "monthly"
  | "invoicePreview"
  | "invoiceStatusUpdate"
  | "invoiceExport";

export const roleLabels: Record<UserRole, string> = {
  admin: "管理者",
  bank_staff: "振込担当",
  cash_staff: "現金担当",
  viewer: "閲覧のみ",
};

export const rolePermissions: Record<UserRole, PermissionKey[]> = {
  admin: ["dashboard", "bank", "cash", "master", "monthly", "invoicePreview", "invoiceStatusUpdate", "invoiceExport"],
  bank_staff: ["dashboard", "bank", "master", "monthly", "invoicePreview", "invoiceStatusUpdate", "invoiceExport"],
  cash_staff: ["dashboard", "cash", "master", "monthly", "invoicePreview", "invoiceStatusUpdate", "invoiceExport"],
  viewer: ["dashboard", "monthly", "invoicePreview", "invoiceExport"],
};

export const currentUserRole = resolveConfiguredRole(process.env.NEXT_PUBLIC_CURRENT_USER_ROLE);

export function canAccess(role: UserRole, permission: PermissionKey) {
  return rolePermissions[role].includes(permission);
}

export function requirePermission(role: UserRole, permission: PermissionKey) {
  if (!canAccess(role, permission)) {
    throw new Error(`${roleLabels[role]}にはこの操作の権限がありません。`);
  }
}

export function visibleCustomerTypesForRole(role: UserRole): CustomerType[] {
  if (role === "bank_staff") return ["bank"];
  if (role === "cash_staff") return ["cash"];
  return ["bank", "cash"];
}

export function canSeeCustomerType(role: UserRole, customerType: CustomerType) {
  return visibleCustomerTypesForRole(role).includes(customerType);
}

function resolveConfiguredRole(value: string | undefined): UserRole {
  if (value === "admin" || value === "bank_staff" || value === "cash_staff" || value === "viewer") {
    return value;
  }
  return "admin";
}
