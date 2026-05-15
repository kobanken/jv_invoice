"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccess, currentUserRole, roleLabels, type PermissionKey } from "@/config/permissions";

type NavItem = {
  label: string;
  href: string;
  permission: PermissionKey;
};

type NavGroup = {
  title: string;
  permission?: PermissionKey;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "",
    items: [{ label: "ダッシュボード", href: "/", permission: "dashboard" }],
  },
  {
    title: "振込管理",
    permission: "bank",
    items: [
      { label: "顧客管理", href: "/bank/customers", permission: "bank" },
      { label: "個別売上調整", href: "/bank/sales", permission: "bank" },
      { label: "請求一覧", href: "/bank/invoices", permission: "bank" },
      { label: "入金確認", href: "/bank/payments", permission: "bank" },
    ],
  },
  {
    title: "現金管理",
    permission: "cash",
    items: [
      { label: "顧客管理", href: "/cash/customers", permission: "cash" },
      { label: "個別売上調整", href: "/cash/sales", permission: "cash" },
      { label: "請求一覧", href: "/cash/invoices", permission: "cash" },
      { label: "集金確認", href: "/cash/collections", permission: "cash" },
    ],
  },
  {
    title: "マスタ管理",
    permission: "master",
    items: [
      { label: "Phase 2 API", href: "/phase2", permission: "master" },
      { label: "商品マスタ", href: "/masters/products", permission: "master" },
      { label: "単価マスタ", href: "/masters/prices", permission: "master" },
    ],
  },
  {
    title: "",
    items: [
      { label: "月次集計", href: "/monthly", permission: "monthly" },
      { label: "請求書プレビュー", href: "/invoice-preview", permission: "invoicePreview" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-teal-700">JV INVOICE</p>
            <h1 className="text-base font-bold">請求管理</h1>
          </div>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{roleLabels[currentUserRole]}</span>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navGroups.flatMap((group) =>
            group.items
              .filter((item) => canAccess(currentUserRole, item.permission))
              .map((item) => (
                <Link
                  key={`${group.title}-${item.href}`}
                  href={item.href}
                  className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${
                    pathname === item.href ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {group.title ? `${group.title.replace("管理", "")} ${item.label}` : item.label}
                </Link>
              )),
          )}
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 z-10 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-[11px] font-bold tracking-wide text-teal-700">JV INVOICE</p>
          <h1 className="mt-1 text-xl font-bold">請求管理</h1>
          <p className="mt-3 inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            role: {roleLabels[currentUserRole]}
          </p>
        </div>
        <nav className="space-y-5 px-4 py-5">
          {navGroups.map((group, index) => {
            if (group.permission && !canAccess(currentUserRole, group.permission)) return null;
            return (
              <div key={`${group.title}-${index}`}>
                {group.title ? (
                  <p className="px-2 pb-2 text-xs font-semibold text-slate-500">{group.title}</p>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    if (!canAccess(currentUserRole, item.permission)) return null;
                    return (
                      <Link
                        key={`${item.label}-${item.href}`}
                        href={item.href}
                        className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                          pathname === item.href
                            ? "bg-teal-700 text-white"
                            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
