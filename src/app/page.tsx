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
    { label: "振込請求合計", value: formatCurrencyJPY(metrics.bankTotal) },
    { label: "現金請求合計", value: formatCurrencyJPY(metrics.cashTotal) },
    { label: "総請求合計", value: formatCurrencyJPY(metrics.total) },
    { label: "未送付件数", value: `${metrics.undeliveredCount}件` },
    { label: "未入金件数", value: `${metrics.unpaidBankCount}件` },
    { label: "未集金件数", value: `${metrics.uncollectedCashCount}件` },
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
        description="Phase 1 は対象月ごとの請求・送付・入金/集金ステータスをモックデータで確認します。"
      />
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-700" htmlFor="target-month">
          対象月
        </label>
        <input
          id="target-month"
          type="month"
          defaultValue={targetMonth}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <StatusBadge tone="teal">モック集計</StatusBadge>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h3 className="text-base font-bold">請求書区分別件数</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {deliveryItems.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-xl font-bold">{item.value}件</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
