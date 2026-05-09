import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export default function Phase2TodoPage() {
  return (
    <AppShell>
      <PageHeader
        title="Phase 2 / Phase 3 TODO"
        description="今回は Phase 1 のみ実装済みです。売上入力、入金/集金確認、請求書プレビュー、PDF出力などは README の TODO に整理しています。"
      />
      <div className="surface p-5 text-sm text-slate-700">
        Phase 2 以降で実装予定です。データ型、分離モック、lib の入口は追加済みです。
      </div>
    </AppShell>
  );
}
