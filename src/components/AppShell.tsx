import Link from "next/link";
import { canAccess, currentUserRole } from "@/config/permissions";

const navGroups = [
  {
    title: "",
    items: [{ label: "ダッシュボード", href: "/", permission: "dashboard" }],
  },
  {
    title: "振込管理",
    permission: "bank",
    items: [
      { label: "顧客管理", href: "/bank/customers", permission: "bank" },
      { label: "請求一覧", href: "/bank/invoices", permission: "bank" },
      { label: "売上入力", href: "/todo/phase2", permission: "bank", todo: true },
      { label: "入金確認", href: "/todo/phase2", permission: "bank", todo: true },
    ],
  },
  {
    title: "現金管理",
    permission: "cash",
    items: [
      { label: "顧客管理", href: "/cash/customers", permission: "cash" },
      { label: "請求一覧", href: "/cash/invoices", permission: "cash" },
      { label: "売上入力", href: "/todo/phase2", permission: "cash", todo: true },
      { label: "集金確認", href: "/todo/phase2", permission: "cash", todo: true },
    ],
  },
  {
    title: "マスタ管理",
    permission: "master",
    items: [
      { label: "商品マスタ", href: "/todo/phase2", permission: "master", todo: true },
      { label: "単価マスタ", href: "/todo/phase2", permission: "master", todo: true },
    ],
  },
  {
    title: "",
    items: [
      { label: "月次集計", href: "/monthly", permission: "monthly" },
      { label: "請求書プレビュー", href: "/todo/phase2", permission: "invoicePreview", todo: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-5 py-5">
          <p className="text-xs font-semibold text-teal-700">JV INVOICE</p>
          <h1 className="mt-1 text-lg font-bold">請求管理</h1>
          <p className="mt-2 text-xs text-slate-500">role: {currentUserRole}</p>
        </div>
        <nav className="space-y-5 px-3 py-4">
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
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <span>{item.label}</span>
                        {item.todo ? <span className="text-[10px] text-slate-400">TODO</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
