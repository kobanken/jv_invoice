# JV請求管理

タオル・おしぼり配達/クリーニング事業向けの請求管理システムです。  
Next.js 15 / TypeScript / Tailwind CSS で、管理画面、型定義、分離モックデータ、基本集計ロジックを実装しています。

## 現在の実装範囲

- 振込顧客と現金顧客のデータファイル分離
- 共通型定義
- 共通 lib 関数
- 左サイドバー付き管理画面レイアウト
- ダッシュボード
- 振込顧客管理
- 現金顧客管理
- 振込請求一覧
- 現金請求一覧
- 月次集計
- role / permission によるナビゲーション表示制御の土台
- 振込売上入力
- 現金売上入力
- 顧客別単価マスタからの単価自動反映
- 振込入金確認と候補判定
- 現金集金確認と差額表示
- 請求書プレビュー
- 商品マスタ
- 単価マスタ

## DB分離方針

現段階では外部DBに接続せず、モックデータで実装しています。

- 振込データ: `src/data/bank.ts`
- 現金データ: `src/data/cash.ts`
- 商品マスタ: `src/data/products.ts`

振込顧客と現金顧客は同じ配列・同じDBとして混ぜず、画面ごとに参照元を分けています。  
型定義、表示ロジック、集計ロジックは `src/types` と `src/lib` に共通化しています。

## 権限設計

`src/config/permissions.ts` の `currentUserRole` を変更すると、サイドバーの表示範囲を切り替えられます。

- `admin`: すべて表示
- `bank_staff`: 振込管理中心
- `cash_staff`: 現金管理中心
- `viewer`: ダッシュボード・月次集計・プレビュー系のみ

将来的な認証/認可導入時は、この設定を Supabase Auth、NextAuth、独自セッションなどに置き換える想定です。

## ディレクトリ構成

```text
src/
  app/                 App Router ページ
  components/          管理画面 UI コンポーネント
  config/              role / permission 設定
  data/                分離モックデータ
  lib/                 集計、ID、金額、単価、照合などの共通関数
  types/               業務型定義
```

## 起動方法

```bash
npm install
npm run dev
```

## 検証

```bash
npm run lint
npm run build
```

## Phase 2 実装済み

- 売上入力画面
- 顧客別単価マスタ参照 UI
- `getCustomerPrice` を使った単価自動反映
- 請求書プレビュー画面
- A4縦の請求書テンプレート
- `getInvoiceDetails` による対象顧客・対象月・締め日別の明細表示
- 振込入金確認画面
- `matchPaymentCandidates` のスコアリング強化
- 現金集金確認画面
- `calculateCashCollectionDifference` による差額表示と状況判定
- 商品マスタ画面
- 単価マスタ画面

## Phase 3 TODO

- PDF出力
- Gmail下書き作成
- LINE用画像出力
- 権限管理強化
- Supabase / SQLite / Google Sheets / CSV / Apps Script などへの保存先移行
- インボイス対応
- 入力データの永続化
- 請求発行/送付/入金/集金ステータス更新の保存

## 設計メモ

- 請求書テンプレートは 1 つだけ用意し、顧客ID・対象月・締め日で表示内容を切り替える設計にします。
- 店舗ごと、月ごとにテンプレートやシートを複製する設計は避けます。
- 月次集計では現金顧客名を表示せず、現金合計だけを表示します。
- 銀行明細CSVは前提にせず、入金確認は手入力・目視照合を前提にします。
- TODO Phase 3: 請求書プレビューの「PDF出力予定」ボタンを実出力に接続します。
