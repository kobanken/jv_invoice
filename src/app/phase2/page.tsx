import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Phase2ApiPrototype } from "@/components/phase2/Phase2ApiPrototype";

export default function Phase2Page() {
  return (
    <AppShell>
      <PageHeader
        title="Phase 2 APIプロトタイプ"
        description="Xserver上のPHP APIとMySQL/MariaDBを前提に、顧客・店舗・単価・横型納品入力・請求明細・請求集計を最小構成で接続します。"
      />
      <Phase2ApiPrototype />
    </AppShell>
  );
}
