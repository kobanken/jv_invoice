import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { bankInvoices } from "@/data/bank";
import { cashInvoices } from "@/data/cash";
import { buildDashboardMetrics } from "@/lib/aggregates";
import { formatCurrencyJPY } from "@/lib/format";

const targetMonth = "2026-05";

export default function DashboardPage() {
  const metrics = buildDashboardMetrics(bankInvoices, cashInvoices, targetMonth);
  const items = [
    { label: "振込請求合計", value: formatCurrencyJPY(metrics.bankTotal), caption: "振込顧客のみ" },
    { label: "現金請求合計", value: formatCurrencyJPY(metrics.cashTotal), caption: "現金顧客のみ" },
    { label: "総請求合計", value: formatCurrencyJPY(metrics.total), caption: "振込 + 現金" },
    { label: "未送付件数", value: `${metrics.undeliveredCount}件`, caption: "送付状況が未送付" },
    { label: "未入金件数", value: `${metrics.unpaidBankCount}件`, caption: "振込請求の未入金" },
    { label: "未集金件数", value: `${metrics.uncollectedCashCount}件`, caption: "現金請求の未集金" },
  ];
  const deliveryItems = [
    { label: "Gmail PDF対象", value: metrics.gmailPdfCount },
    { label: "LINE対象", value: metrics.lineCount },
    { label: "郵送対象", value: metrics.postalCount },
    { label: "手渡し対象", value: metrics.handDeliveryCount },
  ];

  return (
    <AppShell>
      <PageHeader
        title="ダッシュボード"
        description="対象月ごとの請求・送付・入金/集金ステータスをモックデータで確認します。"
      />
      <div className="surface mb-6 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">対象月の状況</p>
          <p className="mt-1 text-xs text-slate-500">請求・送付・入金/集金の進捗を月単位で確認します。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor="target-month">
            対象月
          </label>
          <input id="target-month" type="month" defaultValue={targetMonth} className="field min-w-40" />
          <StatusBadge tone="teal">モック集計</StatusBadge>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="surface px-5 py-4">
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-normal lg:text-3xl">{item.value}</p>
            <p className="mt-2 text-xs text-slate-500">{item.caption}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold">請求書区分別件数</h3>
            <p className="mt-1 text-xs text-slate-500">送付方法ごとの作業量を確認します。</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deliveryItems.map((item) => (
            <div key={item.label} className="surface px-4 py-4">
              <p className="text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-bold">{item.value}件</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
