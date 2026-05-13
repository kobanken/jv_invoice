"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type {
  ApiCustomer,
  ApiPrice,
  ApiStore,
  DeliveryListResponse,
  DeliveryRow,
  HorizontalDeliveryItem,
  InvoiceSummary,
  PriceCategory,
} from "@/types/api";
import { apiBaseUrl, apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { formatApiClosingDay, formatApiDeliveryMethod, formatPaymentType, formatPriceCategory } from "@/lib/api/format";
import { formatCurrencyJPY } from "@/lib/format";

type TabKey = "customers" | "stores" | "prices" | "deliveries" | "details" | "summary";

const tabs: { key: TabKey; label: string }[] = [
  { key: "customers", label: "顧客マスタ" },
  { key: "stores", label: "店舗マスタ" },
  { key: "prices", label: "単価マスタ" },
  { key: "deliveries", label: "納品入力_横型" },
  { key: "details", label: "請求明細_出力" },
  { key: "summary", label: "請求集計" },
];

const tabsWithTargetSelector: TabKey[] = ["deliveries", "details", "summary"];

const closingDayOptions = [
  { value: 15, label: "15日" },
  { value: 20, label: "20日" },
  { value: 31, label: "月末" },
];

const deliveryEntryCount = 20;

function createEmptyDeliveryEntries() {
  return Array.from({ length: deliveryEntryCount }, () => "");
}

const emptyCustomer = {
  customer_code: "",
  name: "",
  honorific: "御中",
  payment_type: "bank_transfer",
  delivery_method: "gmail_pdf",
  closing_day: 31,
  postal_code: "",
  address: "",
  email: "",
  line_name: "",
  bank_transfer_name: "",
  note: "",
};

const emptyStore = {
  customer_id: 0,
  name: "",
  display_order: 0,
  note: "",
};

const emptyPrice = {
  customer_id: 0,
  store_id: "",
  item_name: "",
  unit_price: 0,
  category: "product" as PriceCategory,
  start_date: "2026-04-01",
  end_date: "",
  note: "",
};

export function Phase2ApiPrototype() {
  const [activeTab, setActiveTab] = useState<TabKey>("customers");
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [prices, setPrices] = useState<ApiPrice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [selectedStoreId, setSelectedStoreId] = useState<number>(0);
  const [billingMonth, setBillingMonth] = useState("2026-04");
  const [deliveryData, setDeliveryData] = useState<DeliveryListResponse | null>(null);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const shouldShowTargetSelector = tabsWithTargetSelector.includes(activeTab);

  const loadBaseData = useCallback(async () => {
    const [nextCustomers, nextStores, nextPrices] = await Promise.all([
      apiGet<ApiCustomer[]>("/customers.php"),
      apiGet<ApiStore[]>("/stores.php"),
      apiGet<ApiPrice[]>("/prices.php"),
    ]);
    setCustomers(nextCustomers);
    setStores(nextStores);
    setPrices(nextPrices);
    setSelectedCustomerId((current) => current);
  }, []);

  const loadDerivedData = useCallback(async () => {
    if (!selectedCustomerId) return;
    const [nextDeliveryData, nextSummary] = await Promise.all([
      apiGet<DeliveryListResponse>("/deliveries.php", {
        customer_id: selectedCustomerId,
        store_id: selectedStoreId || null,
        billing_month: billingMonth,
      }),
      apiGet<InvoiceSummary>("/invoice-summary.php", {
        customer_id: selectedCustomerId,
        billing_month: billingMonth,
      }),
    ]);
    setDeliveryData(nextDeliveryData);
    setSummary(nextSummary);
  }, [billingMonth, selectedCustomerId, selectedStoreId]);

  useEffect(() => {
    loadBaseData().catch((exception: unknown) => setError(toErrorMessage(exception)));
  }, [loadBaseData]);

  useEffect(() => {
    const customerStores = stores.filter((store) => store.customer_id === selectedCustomerId);
    setSelectedStoreId((current) => {
      if (current === 0) return 0;
      if (customerStores.some((store) => store.id === current)) return current;
      return customerStores[0]?.id || 0;
    });
  }, [selectedCustomerId, stores]);

  useEffect(() => {
    loadDerivedData().catch((exception: unknown) => setError(toErrorMessage(exception)));
  }, [loadDerivedData]);

  async function runAction(action: () => Promise<void>, doneMessage: string) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(doneMessage);
    } catch (exception) {
      setError(toErrorMessage(exception));
    }
  }

  return (
    <section className="space-y-5">
      <div className="surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">API Base URL</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{apiBaseUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  activeTab === tab.key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {message ? <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      </div>

      {shouldShowTargetSelector ? (
        <TargetSelector
          customers={customers}
          stores={stores}
          selectedCustomerId={selectedCustomerId}
          selectedStoreId={selectedStoreId}
          billingMonth={billingMonth}
          onCustomerChange={setSelectedCustomerId}
          onStoreChange={setSelectedStoreId}
          onBillingMonthChange={setBillingMonth}
        />
      ) : null}

      {activeTab === "customers" ? (
        <CustomerPanel customers={customers} onReload={loadBaseData} runAction={runAction} />
      ) : null}
      {activeTab === "stores" ? (
        <StorePanel customers={customers} stores={stores} onReload={loadBaseData} runAction={runAction} />
      ) : null}
      {activeTab === "prices" ? (
        <PricePanel customers={customers} stores={stores} prices={prices} onReload={loadBaseData} runAction={runAction} />
      ) : null}
      {activeTab === "deliveries" ? (
        <DeliveryEntryPanel
          selectedCustomerId={selectedCustomerId}
          selectedStoreId={selectedStoreId}
          billingMonth={billingMonth}
          prices={prices}
          onReload={async () => {
            await loadDerivedData();
          }}
          runAction={runAction}
        />
      ) : null}
      {activeTab === "details" ? (
        <InvoiceDetailPanel
          customer={selectedCustomer}
          store={selectedStore}
          stores={stores}
          billingMonth={billingMonth}
          deliveryData={deliveryData}
        />
      ) : null}
      {activeTab === "summary" ? (
        <SummaryPanel
          selectedCustomerId={selectedCustomerId}
          billingMonth={billingMonth}
          summary={summary}
          onReload={loadDerivedData}
          runAction={runAction}
        />
      ) : null}
    </section>
  );
}

function TargetSelector({
  customers,
  stores,
  selectedCustomerId,
  selectedStoreId,
  billingMonth,
  onCustomerChange,
  onStoreChange,
  onBillingMonthChange,
}: {
  customers: ApiCustomer[];
  stores: ApiStore[];
  selectedCustomerId: number;
  selectedStoreId: number;
  billingMonth: string;
  onCustomerChange: (id: number) => void;
  onStoreChange: (id: number) => void;
  onBillingMonthChange: (month: string) => void;
}) {
  const customerStores = stores.filter((store) => store.customer_id === selectedCustomerId);
  const customerOptions = useMemo<CustomerSearchOption<number>[]>(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customer_code} ${customer.name}`,
      keywords: `${customer.name} ${customer.customer_code} ${customer.email ?? ""} ${customer.line_name ?? ""}`,
    }));
  }, [customers]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <CustomerSearchField
        label="顧客"
        value={selectedCustomerId}
        options={customerOptions}
        onChange={onCustomerChange}
        emptyOption={{ value: 0, label: "選択してください" }}
      />
      <label className="block text-sm font-semibold">
        店舗
        <select
          value={selectedStoreId}
          onChange={(event) => onStoreChange(Number(event.target.value))}
          className="field mt-1 w-full font-normal"
        >
          <option value={0}>全店舗（明細/集計）</option>
          {customerStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        請求月
        <input
          type="month"
          value={billingMonth}
          onChange={(event) => onBillingMonthChange(event.target.value)}
          className="field mt-1 w-full font-normal"
        />
      </label>
    </div>
  );
}

function CustomerPanel({
  customers,
  onReload,
  runAction,
}: {
  customers: ApiCustomer[];
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return customers;
    return customers.filter((customer) => {
      const text = normalizeSearchText(
        `${customer.customer_code} ${customer.name} ${customer.email ?? ""} ${customer.line_name ?? ""} ${customer.bank_transfer_name ?? ""} ${customer.note ?? ""}`,
      );
      return text.includes(normalizedQuery);
    });
  }, [customers, query]);

  async function submit() {
    const body = { ...form, closing_day: Number(form.closing_day) };
    if (editingId) {
      await apiPut<ApiCustomer>("/customers.php", { id: editingId, ...body });
    } else {
      await apiPost<ApiCustomer>("/customers.php", body);
    }
    setForm(emptyCustomer);
    setEditingId(null);
    await onReload();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="surface p-5">
        <h3 className="font-bold">顧客登録・編集</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            顧客コード
            <input className="field mt-1 w-full font-normal" value={form.customer_code} onChange={(event) => setForm({ ...form, customer_code: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            請求先名
            <input className="field mt-1 w-full font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              支払区分
              <select
                className="field mt-1 w-full font-normal"
                value={form.payment_type}
                onChange={(event) => setForm({ ...form, payment_type: event.target.value, bank_transfer_name: event.target.value === "bank_transfer" ? form.bank_transfer_name : "" })}
              >
                <option value="bank_transfer">振込</option>
                <option value="cash">現金</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              請求書送付方法
              <select className="field mt-1 w-full font-normal" value={form.delivery_method} onChange={(event) => setForm({ ...form, delivery_method: event.target.value })}>
                <option value="gmail_pdf">Gmail PDF</option>
                <option value="line">LINE</option>
                <option value="hand_delivery">手渡し</option>
                <option value="postal">郵送</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              締め日欄
              <select
                className="field mt-1 w-full font-normal"
                value={form.closing_day}
                onChange={(event) => setForm({ ...form, closing_day: Number(event.target.value) })}
              >
                {closingDayOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              メール
              <input className="field mt-1 w-full font-normal" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
          </div>
          {form.payment_type === "bank_transfer" ? (
            <label className="block text-sm font-semibold text-slate-700">
              振込名義
              <input className="field mt-1 w-full font-normal" value={form.bank_transfer_name} onChange={(event) => setForm({ ...form, bank_transfer_name: event.target.value })} />
            </label>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              郵便番号
              <input className="field mt-1 w-full font-normal" value={form.postal_code} onChange={(event) => setForm({ ...form, postal_code: event.target.value })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              LINE名
              <input className="field mt-1 w-full font-normal" value={form.line_name} onChange={(event) => setForm({ ...form, line_name: event.target.value })} />
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            住所
            <input className="field mt-1 w-full font-normal" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            備考
            <textarea className="field mt-1 w-full font-normal" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </label>
          <button type="button" className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => runAction(submit, "顧客を保存しました。")}>
            {editingId ? "更新" : "登録"}
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="顧客コード・請求先名・メール・振込名義で検索"
            className="field w-full sm:max-w-md"
          />
          <p className="text-xs text-slate-500">表示件数: {filteredCustomers.length} / {customers.length}</p>
        </div>
        <table className="min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr><th className="px-4 py-3">コード</th><th className="px-4 py-3">請求先</th><th className="px-4 py-3">区分</th><th className="px-4 py-3">振込名義</th><th className="px-4 py-3">送付</th><th className="px-4 py-3">締め日欄</th><th className="px-4 py-3">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3 font-semibold">{customer.customer_code}</td>
                <td className="px-4 py-3">{customer.name}</td>
                <td className="px-4 py-3">{formatPaymentType(customer.payment_type)}</td>
                <td className="px-4 py-3">{customer.payment_type === "bank_transfer" ? customer.bank_transfer_name ?? "-" : "-"}</td>
                <td className="px-4 py-3">{formatApiDeliveryMethod(customer.delivery_method)}</td>
                <td className="px-4 py-3">{formatApiClosingDay(Number(customer.closing_day))}</td>
                <td className="space-x-2 px-4 py-3">
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => {
                    setEditingId(customer.id);
                    setForm({
                      customer_code: customer.customer_code,
                      name: customer.name,
                      honorific: customer.honorific,
                      payment_type: customer.payment_type,
                      delivery_method: customer.delivery_method,
                      closing_day: customer.closing_day,
                      postal_code: customer.postal_code ?? "",
                      address: customer.address ?? "",
                      email: customer.email ?? "",
                      line_name: customer.line_name ?? "",
                      bank_transfer_name: customer.bank_transfer_name ?? "",
                      note: customer.note ?? "",
                    });
                  }}>編集</button>
                  <button type="button" className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => runAction(async () => {
                    await apiDelete("/customers.php", { id: customer.id });
                    await onReload();
                  }, "顧客を削除しました。")}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StorePanel({
  customers,
  stores,
  onReload,
  runAction,
}: {
  customers: ApiCustomer[];
  stores: ApiStore[];
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyStore);
  const [editingId, setEditingId] = useState<number | null>(null);
  const customerOptions = useMemo<CustomerSearchOption<number>[]>(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customer_code} ${customer.name}`,
      keywords: `${customer.name} ${customer.customer_code} ${customer.email ?? ""} ${customer.line_name ?? ""}`,
    }));
  }, [customers]);

  async function submit() {
    const body = { ...form, customer_id: Number(form.customer_id), display_order: Number(form.display_order) };
    if (editingId) {
      await apiPut<ApiStore>("/stores.php", { id: editingId, ...body });
    } else {
      await apiPost<ApiStore>("/stores.php", body);
    }
    setForm(emptyStore);
    setEditingId(null);
    await onReload();
  }

  return (
    <MasterTablePanel title="店舗登録・編集">
      <div className="surface p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <CustomerSearchField
            label="顧客"
            value={form.customer_id}
            options={customerOptions}
            onChange={(customerId) => setForm({ ...form, customer_id: customerId })}
            emptyOption={{ value: 0, label: "顧客選択" }}
            className="text-slate-700"
          />
          <label className="block text-sm font-semibold text-slate-700">
            店舗名
            <input className="field mt-1 w-full font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            表示順
            <input className="field mt-1 w-full font-normal" type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} />
          </label>
          <button type="button" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => runAction(submit, "店舗を保存しました。")}>{editingId ? "更新" : "登録"}</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-4 py-3">顧客</th><th className="px-4 py-3">店舗</th><th className="px-4 py-3">表示順</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {stores.map((store) => (
              <tr key={store.id}>
                <td className="px-4 py-3">{customers.find((customer) => customer.id === store.customer_id)?.name ?? "-"}</td>
                <td className="px-4 py-3 font-semibold">{store.name}</td>
                <td className="px-4 py-3">{store.display_order}</td>
                <td className="space-x-2 px-4 py-3">
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => { setEditingId(store.id); setForm({ customer_id: store.customer_id, name: store.name, display_order: store.display_order, note: store.note ?? "" }); }}>編集</button>
                  <button type="button" className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => runAction(async () => { await apiDelete("/stores.php", { id: store.id }); await onReload(); }, "店舗を削除しました。")}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterTablePanel>
  );
}

function PricePanel({
  customers,
  stores,
  prices,
  onReload,
  runAction,
}: {
  customers: ApiCustomer[];
  stores: ApiStore[];
  prices: ApiPrice[];
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyPrice);
  const [editingId, setEditingId] = useState<number | null>(null);
  const candidateStores = stores.filter((store) => store.customer_id === Number(form.customer_id));
  const customerOptions = useMemo<CustomerSearchOption<number>[]>(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customer_code} ${customer.name}`,
      keywords: `${customer.name} ${customer.customer_code} ${customer.email ?? ""} ${customer.line_name ?? ""}`,
    }));
  }, [customers]);

  async function submit() {
    const body = {
      ...form,
      customer_id: Number(form.customer_id),
      store_id: form.store_id === "" ? null : Number(form.store_id),
      unit_price: Number(form.unit_price),
      end_date: form.end_date || null,
    };
    if (editingId) {
      await apiPut<ApiPrice>("/prices.php", { id: editingId, ...body });
    } else {
      await apiPost<ApiPrice>("/prices.php", body);
    }
    setForm(emptyPrice);
    setEditingId(null);
    await onReload();
  }

  return (
    <MasterTablePanel title="顧客別単価登録・編集">
      <div className="surface p-5">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <CustomerSearchField
            label="顧客"
            value={form.customer_id}
            options={customerOptions}
            onChange={(customerId) => setForm({ ...form, customer_id: customerId, store_id: "" })}
            emptyOption={{ value: 0, label: "顧客選択" }}
            className="text-slate-700"
          />
          <label className="block text-sm font-semibold text-slate-700">
            店舗
            <select className="field mt-1 w-full font-normal" value={form.store_id} onChange={(event) => setForm({ ...form, store_id: event.target.value })}>
              <option value="">全店舗共通</option>
              {candidateStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            商品名
            <input className="field mt-1 w-full font-normal" value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            単価
            <input
              className="field mt-1 w-full font-normal"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.unit_price}
              onChange={(event) => setForm({ ...form, unit_price: Number(normalizeIntegerInput(event.target.value)) })}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            区分
            <select className="field mt-1 w-full font-normal" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as PriceCategory })}>
              <option value="product">商品</option>
              <option value="delivery_fee">配達料</option>
              <option value="other_fee">その他手数料</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            開始日
            <input className="field mt-1 w-full font-normal" type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
          </label>
          <button type="button" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => runAction(submit, "単価を保存しました。")}>{editingId ? "更新" : "登録"}</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-4 py-3">顧客</th><th className="px-4 py-3">店舗</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">区分</th><th className="px-4 py-3">単価</th><th className="px-4 py-3">開始</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {prices.map((price) => (
              <tr key={price.id}>
                <td className="px-4 py-3">{customers.find((customer) => customer.id === price.customer_id)?.name ?? "-"}</td>
                <td className="px-4 py-3">{stores.find((store) => store.id === price.store_id)?.name ?? "共通"}</td>
                <td className="px-4 py-3 font-semibold">{price.item_name}</td>
                <td className="px-4 py-3">{formatPriceCategory(price.category)}</td>
                <td className="px-4 py-3">{formatCurrencyJPY(Number(price.unit_price))}</td>
                <td className="px-4 py-3">{price.start_date}</td>
                <td className="space-x-2 px-4 py-3">
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => { setEditingId(price.id); setForm({ customer_id: price.customer_id, store_id: price.store_id ? String(price.store_id) : "", item_name: price.item_name, unit_price: Number(price.unit_price), category: price.category, start_date: price.start_date, end_date: price.end_date ?? "", note: price.note ?? "" }); }}>編集</button>
                  <button type="button" className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => runAction(async () => { await apiDelete("/prices.php", { id: price.id }); await onReload(); }, "単価を削除しました。")}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MasterTablePanel>
  );
}

function DeliveryEntryPanel({
  selectedCustomerId,
  selectedStoreId,
  billingMonth,
  prices,
  onReload,
  runAction,
}: {
  selectedCustomerId: number;
  selectedStoreId: number;
  billingMonth: string;
  prices: ApiPrice[];
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<void>;
}) {
  const visiblePrices = useMemo(() => {
    return prices.filter((price) => price.customer_id === selectedCustomerId && (price.store_id === selectedStoreId || price.store_id === null));
  }, [prices, selectedCustomerId, selectedStoreId]);
  const productPrices = useMemo(() => visiblePrices.filter((price) => price.category === "product"), [visiblePrices]);
  const deliveryFee = useMemo(() => visiblePrices.find((price) => price.category === "delivery_fee"), [visiblePrices]);
  const [deliveryDays, setDeliveryDays] = useState(createEmptyDeliveryEntries);
  const [quantities, setQuantities] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setDeliveryDays(createEmptyDeliveryEntries());
    setQuantities({});
  }, [billingMonth, selectedCustomerId, selectedStoreId]);

  useEffect(() => {
    setQuantities((current) => {
      const next = { ...current };
      productPrices.forEach((price) => {
        next[String(price.id)] = ensureDeliveryEntryCount(next[String(price.id)]);
      });
      return next;
    });
  }, [productPrices]);

  async function submit() {
    const deliveryDates = deliveryDays.map((day) => formatDeliveryDateFromDay(billingMonth, day));
    await apiPost("/deliveries.php", {
      customer_id: selectedCustomerId,
      store_id: selectedStoreId,
      billing_month: billingMonth,
      delivery_dates: deliveryDates,
      items: productPrices.map((price) => ({
        item_name: price.item_name,
        unit_price: Number(price.unit_price),
        category: price.category,
        quantities: ensureDeliveryEntryCount(quantities[String(price.id)]),
      })),
      delivery_fee: deliveryFee
        ? { item_name: deliveryFee.item_name, unit_price: Number(deliveryFee.unit_price) }
        : null,
    });
    await onReload();
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4 text-sm text-slate-600">
        納品日は請求月内の日だけを数字で入力します。空欄は集計対象外、数量が空欄の商品は保存しません。
      </div>
      <div className="table-scroll">
        <table className="min-w-[2140px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">商品名</th>
              <th className="px-4 py-3 text-right">単価</th>
              {deliveryDays.map((_, index) => <th key={index} className="px-3 py-3 text-center">{index + 1}回目</th>)}
              <th className="px-4 py-3 text-right">合計</th>
              <th className="px-4 py-3 text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-slate-50/60">
              <td className="px-4 py-3 font-semibold">納品日</td>
              <td className="px-4 py-3"></td>
              {deliveryDays.map((day, index) => (
                <td key={index} className="px-2 py-2">
                  <input
                    className="field w-20 text-right"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="日"
                    value={day}
                    onChange={(event) => setDeliveryDays(deliveryDays.map((item, itemIndex) => itemIndex === index ? normalizeDayInput(event.target.value, billingMonth) : item))}
                  />
                </td>
              ))}
              <td></td><td></td>
            </tr>
            {productPrices.map((price) => {
              const row = ensureDeliveryEntryCount(quantities[String(price.id)]);
              const totalQuantity = row.reduce((sum, value) => sum + Number(value || 0), 0);
              const amount = totalQuantity * Number(price.unit_price);
              return (
                <tr key={price.id}>
                  <td className="px-4 py-3 font-semibold">{price.item_name}</td>
                  <td className="px-4 py-3 text-right">{formatCurrencyJPY(Number(price.unit_price))}</td>
                  {row.map((value, index) => (
                    <td key={index} className="px-2 py-2">
                      <input
                        className="field w-20 text-right"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={value}
                        onChange={(event) => setQuantities({ ...quantities, [String(price.id)]: row.map((item, itemIndex) => itemIndex === index ? normalizeIntegerInput(event.target.value) : item) })}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold">{totalQuantity}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrencyJPY(amount)}</td>
                </tr>
              );
            })}
            {deliveryFee ? (
              <tr className="bg-teal-50/40">
                <td className="px-4 py-3 font-semibold">{deliveryFee.item_name}</td>
                <td className="px-4 py-3 text-right">{formatCurrencyJPY(Number(deliveryFee.unit_price))}</td>
                {deliveryDays.map((day, index) => <td key={index} className="px-4 py-3 text-center">{day ? 1 : ""}</td>)}
                <td className="px-4 py-3 text-right font-semibold">{deliveryDays.filter(Boolean).length}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyJPY(deliveryDays.filter(Boolean).length * Number(deliveryFee.unit_price))}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <button type="button" disabled={!selectedCustomerId || !selectedStoreId} className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" onClick={() => runAction(submit, "納品データを保存しました。")}>横型入力を保存</button>
    </div>
  );
}

function InvoiceDetailPanel({
  customer,
  store,
  stores,
  billingMonth,
  deliveryData,
}: {
  customer?: ApiCustomer;
  store?: ApiStore;
  stores: ApiStore[];
  billingMonth: string;
  deliveryData: DeliveryListResponse | null;
}) {
  const storeBlocks = useMemo(() => {
    if (!deliveryData) return [];
    if (store) {
      return [{ storeName: store.name, horizontal: deliveryData.horizontal }];
    }
    const grouped = new Map<number, DeliveryRow[]>();
    deliveryData.rows.forEach((row) => {
      const current = grouped.get(Number(row.store_id)) ?? [];
      current.push(row);
      grouped.set(Number(row.store_id), current);
    });
    return Array.from(grouped.entries()).map(([storeId, rows]) => ({
      storeName: stores.find((item) => item.id === storeId)?.name ?? `店舗ID: ${storeId}`,
      horizontal: buildHorizontalFromRows(rows),
    }));
  }, [deliveryData, store, stores]);
  const summary = deliveryData?.summary;
  return (
    <div className="mx-auto max-w-[1120px] bg-white p-8 shadow-sm print:shadow-none">
      <div className="flex flex-col gap-4 border-b-2 border-slate-900 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-normal">請求明細</h3>
          <p className="mt-3 text-lg font-semibold">{customer?.name ?? "-"} {customer?.honorific ?? ""}</p>
          <p className="text-sm text-slate-600">店舗: {store?.name ?? "全店舗"} / 請求月: {billingMonth}</p>
        </div>
        <div className="text-sm text-slate-700">
          <p>対象期間: {billingMonth}-01 から月末</p>
          <p>締日: {customer ? formatApiClosingDay(Number(customer.closing_day)) : "-"}</p>
          <p>発行日: {new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>
      <div className="space-y-8">
        {storeBlocks.map((block) => (
          <section key={block.storeName}>
            <h4 className="mt-6 border-l-4 border-teal-700 pl-3 text-base font-bold">{block.storeName}</h4>
            <HorizontalInvoiceTable dates={block.horizontal.delivery_dates} items={block.horizontal.items} />
          </section>
        ))}
        {storeBlocks.length === 0 ? <HorizontalInvoiceTable dates={[]} items={[]} /> : null}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2 text-sm">
          <SummaryLine label="商品合計" value={summary?.product_total ?? 0} />
          <SummaryLine label="配達料" value={summary?.delivery_fee_total ?? 0} />
          <SummaryLine label="その他手数料" value={summary?.other_fee_total ?? 0} />
          <SummaryLine label="税込合計" value={summary?.total ?? 0} strong />
        </div>
      </div>
    </div>
  );
}

function buildHorizontalFromRows(rows: DeliveryRow[]) {
  const deliveryDates: string[] = [];
  const items = new Map<string, HorizontalDeliveryItem>();
  rows.forEach((row) => {
    if (!deliveryDates.includes(row.delivery_date)) deliveryDates.push(row.delivery_date);
    const key = `${row.item_name}|${row.unit_price}|${row.category}`;
    const current = items.get(key) ?? {
      item_name: row.item_name,
      unit_price: Number(row.unit_price),
      category: row.category,
      quantities: {},
      total_quantity: 0,
      amount: 0,
    };
    current.quantities[row.delivery_date] = Number(row.quantity);
    current.total_quantity += Number(row.quantity);
    current.amount += Number(row.amount);
    items.set(key, current);
  });
  return {
    delivery_dates: deliveryDates,
    items: Array.from(items.values()),
  };
}

function HorizontalInvoiceTable({ dates, items }: { dates: string[]; items: HorizontalDeliveryItem[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-3 py-3">商品名</th>
            <th className="px-3 py-3 text-right">単価</th>
            {dates.map((date) => <th key={date} className="px-3 py-3 text-right">{date.slice(5).replace("-", "/")}</th>)}
            <th className="px-3 py-3 text-right">合計数量</th>
            <th className="px-3 py-3 text-right">金額</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={`${item.item_name}-${item.unit_price}-${item.category}`}>
              <td className="px-3 py-3">{item.item_name}</td>
              <td className="px-3 py-3 text-right">{formatCurrencyJPY(Number(item.unit_price))}</td>
              {dates.map((date) => <td key={date} className="px-3 py-3 text-right">{item.quantities[date] ?? ""}</td>)}
              <td className="px-3 py-3 text-right font-semibold">{item.total_quantity}</td>
              <td className="px-3 py-3 text-right font-semibold">{formatCurrencyJPY(Number(item.amount))}</td>
            </tr>
          ))}
          {items.length === 0 ? <tr><td colSpan={dates.length + 4} className="px-3 py-8 text-center text-slate-500">保存済み明細はありません。</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function ensureDeliveryEntryCount(values: string[] = []) {
  return Array.from({ length: deliveryEntryCount }, (_, index) => values[index] ?? "");
}

function normalizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function normalizeDayInput(value: string, billingMonth: string) {
  const numericValue = normalizeIntegerInput(value);
  if (!numericValue) return "";
  const day = Number(numericValue);
  if (day < 1) return "";
  return String(Math.min(day, getDaysInBillingMonth(billingMonth)));
}

function getDaysInBillingMonth(billingMonth: string) {
  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function formatDeliveryDateFromDay(billingMonth: string, day: string) {
  if (!day) return "";
  return `${billingMonth}-${day.padStart(2, "0")}`;
}

function SummaryPanel({
  selectedCustomerId,
  billingMonth,
  summary,
  onReload,
  runAction,
}: {
  selectedCustomerId: number;
  billingMonth: string;
  summary: InvoiceSummary | null;
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<void>;
}) {
  async function saveSummary() {
    await apiPost("/invoice-summary.php", { customer_id: selectedCustomerId, billing_month: billingMonth });
    await onReload();
  }
  return (
    <div className="surface max-w-xl p-5">
      <h3 className="font-bold">請求集計</h3>
      <div className="mt-4 space-y-2 text-sm">
        <SummaryLine label="商品合計" value={summary?.product_total ?? 0} />
        <SummaryLine label="配達料" value={summary?.delivery_fee_total ?? 0} />
        <SummaryLine label="その他手数料" value={summary?.other_fee_total ?? 0} />
        <SummaryLine label="税抜合計" value={summary?.subtotal ?? 0} />
        <SummaryLine label="消費税" value={summary?.tax ?? 0} />
        <SummaryLine label="税込合計" value={summary?.total ?? 0} strong />
      </div>
      <button type="button" disabled={!selectedCustomerId} className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" onClick={() => runAction(saveSummary, "請求集計を保存しました。")}>集計を保存</button>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-2 ${strong ? "text-lg font-bold" : ""}`}>
      <span>{label}</span>
      <span>{formatCurrencyJPY(Number(value))}</span>
    </div>
  );
}

function MasterTablePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

function toErrorMessage(exception: unknown) {
  return exception instanceof Error ? exception.message : "処理に失敗しました。";
}
