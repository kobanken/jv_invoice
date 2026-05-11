"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatApiDeliveryMethod, formatPaymentType, formatPriceCategory } from "@/lib/api/format";
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

  const loadBaseData = useCallback(async () => {
    const [nextCustomers, nextStores, nextPrices] = await Promise.all([
      apiGet<ApiCustomer[]>("/customers.php"),
      apiGet<ApiStore[]>("/stores.php"),
      apiGet<ApiPrice[]>("/prices.php"),
    ]);
    setCustomers(nextCustomers);
    setStores(nextStores);
    setPrices(nextPrices);
    setSelectedCustomerId((current) => current || nextCustomers[0]?.id || 0);
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
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="block text-sm font-semibold">
        顧客
        <select
          value={selectedCustomerId}
          onChange={(event) => onCustomerChange(Number(event.target.value))}
          className="field mt-1 w-full font-normal"
        >
          <option value={0}>選択してください</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.customer_code} {customer.name}
            </option>
          ))}
        </select>
      </label>
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
          <input className="field w-full" placeholder="顧客コード" value={form.customer_code} onChange={(event) => setForm({ ...form, customer_code: event.target.value })} />
          <input className="field w-full" placeholder="請求先名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" value={form.payment_type} onChange={(event) => setForm({ ...form, payment_type: event.target.value })}>
              <option value="bank_transfer">振込</option>
              <option value="cash">現金</option>
            </select>
            <select className="field" value={form.delivery_method} onChange={(event) => setForm({ ...form, delivery_method: event.target.value })}>
              <option value="gmail_pdf">Gmail PDF</option>
              <option value="line">LINE</option>
              <option value="hand_delivery">手渡し</option>
              <option value="postal">郵送</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" placeholder="敬称" value={form.honorific} onChange={(event) => setForm({ ...form, honorific: event.target.value })} />
            <input className="field" type="number" min="1" max="31" placeholder="締日" value={form.closing_day} onChange={(event) => setForm({ ...form, closing_day: Number(event.target.value) })} />
          </div>
          <input className="field w-full" placeholder="メール" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <textarea className="field w-full" placeholder="住所・備考" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          <button type="button" className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => runAction(submit, "顧客を保存しました。")}>
            {editingId ? "更新" : "登録"}
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr><th className="px-4 py-3">コード</th><th className="px-4 py-3">請求先</th><th className="px-4 py-3">区分</th><th className="px-4 py-3">送付</th><th className="px-4 py-3">締日</th><th className="px-4 py-3">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3 font-semibold">{customer.customer_code}</td>
                <td className="px-4 py-3">{customer.name}</td>
                <td className="px-4 py-3">{formatPaymentType(customer.payment_type)}</td>
                <td className="px-4 py-3">{formatApiDeliveryMethod(customer.delivery_method)}</td>
                <td className="px-4 py-3">{customer.closing_day}日</td>
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
          <select className="field" value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: Number(event.target.value) })}>
            <option value={0}>顧客選択</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_code} {customer.name}</option>)}
          </select>
          <input className="field" placeholder="店舗名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" type="number" placeholder="表示順" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} />
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
          <select className="field" value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: Number(event.target.value), store_id: "" })}>
            <option value={0}>顧客選択</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_code} {customer.name}</option>)}
          </select>
          <select className="field" value={form.store_id} onChange={(event) => setForm({ ...form, store_id: event.target.value })}>
            <option value="">全店舗共通</option>
            {candidateStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
          <input className="field" placeholder="商品名" value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
          <input className="field" type="number" placeholder="単価" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: Number(event.target.value) })} />
          <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as PriceCategory })}>
            <option value="product">商品</option>
            <option value="delivery_fee">配達料</option>
            <option value="other_fee">その他手数料</option>
          </select>
          <input className="field" type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
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
  const productPrices = visiblePrices.filter((price) => price.category === "product");
  const deliveryFee = visiblePrices.find((price) => price.category === "delivery_fee");
  const [dates, setDates] = useState(["", "", "", "", ""]);
  const [quantities, setQuantities] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setQuantities((current) => {
      const next = { ...current };
      productPrices.forEach((price) => {
        if (!next[String(price.id)]) next[String(price.id)] = ["", "", "", "", ""];
      });
      return next;
    });
  }, [productPrices]);

  async function submit() {
    await apiPost("/deliveries.php", {
      customer_id: selectedCustomerId,
      store_id: selectedStoreId,
      billing_month: billingMonth,
      delivery_dates: dates,
      items: productPrices.map((price) => ({
        item_name: price.item_name,
        unit_price: Number(price.unit_price),
        category: price.category,
        quantities: quantities[String(price.id)] ?? [],
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
        納品日は空欄を集計対象外にし、数量が空欄の商品は保存しません。保存時に `delivery_headers` と `delivery_items` へ縦型で登録します。
      </div>
      <div className="table-scroll">
        <table className="min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">商品名</th>
              <th className="px-4 py-3 text-right">単価</th>
              {dates.map((_, index) => <th key={index} className="px-3 py-3 text-center">{index + 1}回目</th>)}
              <th className="px-4 py-3 text-right">合計</th>
              <th className="px-4 py-3 text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-slate-50/60">
              <td className="px-4 py-3 font-semibold">納品日</td>
              <td className="px-4 py-3"></td>
              {dates.map((date, index) => (
                <td key={index} className="px-2 py-2">
                  <input type="date" className="field w-36" value={date} onChange={(event) => setDates(dates.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
                </td>
              ))}
              <td></td><td></td>
            </tr>
            {productPrices.map((price) => {
              const row = quantities[String(price.id)] ?? ["", "", "", "", ""];
              const totalQuantity = row.reduce((sum, value) => sum + Number(value || 0), 0);
              const amount = totalQuantity * Number(price.unit_price);
              return (
                <tr key={price.id}>
                  <td className="px-4 py-3 font-semibold">{price.item_name}</td>
                  <td className="px-4 py-3 text-right">{formatCurrencyJPY(Number(price.unit_price))}</td>
                  {row.map((value, index) => (
                    <td key={index} className="px-2 py-2">
                      <input type="number" min="0" className="field w-24 text-right" value={value} onChange={(event) => setQuantities({ ...quantities, [String(price.id)]: row.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />
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
                {dates.map((date, index) => <td key={index} className="px-4 py-3 text-center">{date ? 1 : ""}</td>)}
                <td className="px-4 py-3 text-right font-semibold">{dates.filter(Boolean).length}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyJPY(dates.filter(Boolean).length * Number(deliveryFee.unit_price))}</td>
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
          <p>締日: {customer?.closing_day ?? "-"}日</p>
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
