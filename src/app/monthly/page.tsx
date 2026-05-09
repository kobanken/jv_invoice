import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { bankInvoices } from "@/data/bank";
import { cashInvoices } from "@/data/cash";
import { filterInvoicesByMonth, sumInvoices } from "@/lib/aggregates";
import { formatCurrencyJPY } from "@/lib/format";

const months = ["2026-05"];

export default function MonthlyPage() {
  return (
    <AppShell>
      <PageHeader
        title="月次集計"
        description="顧客名を表示せず、振込合計・現金合計・総合計だけを月別に確認します。"
      />
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">対象月</th>
              <th className="px-4 py-3">振込合計</th>
              <th className="px-4 py-3">現金合計</th>
              <th className="px-4 py-3">総合計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((month) => {
              const bankTotal = sumInvoices(filterInvoicesByMonth(bankInvoices, month));
              const cashTotal = sumInvoices(filterInvoicesByMonth(cashInvoices, month));
              return (
                <tr key={month}>
                  <td className="px-4 py-3 font-semibold">{month}</td>
                  <td className="px-4 py-3">{formatCurrencyJPY(bankTotal)}</td>
                  <td className="px-4 py-3">{formatCurrencyJPY(cashTotal)}</td>
                  <td className="px-4 py-3 font-bold">{formatCurrencyJPY(bankTotal + cashTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        現金顧客の店舗名・請求先名・集金担当などの詳細はこの画面に表示しません。
      </p>
    </AppShell>
  );
}
