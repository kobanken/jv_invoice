import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { currentUserRole } from "@/config/permissions";
import { bankInvoices } from "@/data/bank";
import { cashInvoices } from "@/data/cash";
import { filterInvoicesByRole, getVisibleTotalLabel, sumInvoices } from "@/lib/aggregates";
import { formatCurrencyJPY } from "@/lib/format";

const months = ["2026-05"];

export default function MonthlyPage() {
  const showBank = currentUserRole === "admin" || currentUserRole === "bank_staff" || currentUserRole === "viewer";
  const showCash = currentUserRole === "admin" || currentUserRole === "cash_staff" || currentUserRole === "viewer";
  const showTotal = showBank && showCash;

  return (
    <AppShell>
      <PageHeader
        title="月次集計"
        description="顧客名を表示せず、権限で許可された範囲の月次合計だけを確認します。"
      />
      <div className="table-scroll">
        <table className="min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">対象月</th>
              {showBank ? <th className="px-4 py-3">{getVisibleTotalLabel(currentUserRole, "bank")}</th> : null}
              {showCash ? <th className="px-4 py-3">{getVisibleTotalLabel(currentUserRole, "cash")}</th> : null}
              {showTotal ? <th className="px-4 py-3">総合計</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((month) => {
              const visibleInvoices = filterInvoicesByRole(bankInvoices, cashInvoices, month, currentUserRole);
              const bankTotal = sumInvoices(visibleInvoices.bank);
              const cashTotal = sumInvoices(visibleInvoices.cash);
              return (
                <tr key={month}>
                  <td className="px-4 py-3 font-semibold">{month}</td>
                  {showBank ? <td className="px-4 py-3">{formatCurrencyJPY(bankTotal)}</td> : null}
                  {showCash ? <td className="px-4 py-3">{formatCurrencyJPY(cashTotal)}</td> : null}
                  {showTotal ? <td className="px-4 py-3 font-bold">{formatCurrencyJPY(bankTotal + cashTotal)}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        顧客の店舗名・請求先名・担当者名などの詳細はこの画面に表示しません。振込担当には振込分のみ、現金担当には現金分のみを表示します。
      </p>
    </AppShell>
  );
}
