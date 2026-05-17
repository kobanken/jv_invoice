"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerSearchField, type CustomerSearchOption } from "@/components/CustomerSearchField";
import type {
  ApiCustomer,
  ApiDeliveryMethod,
  ApiPrice,
  ApiStore,
  DeliveryListResponse,
  DeliveryRow,
  HorizontalDeliveryItem,
  InvoiceSummary,
  PriceCategory,
} from "@/types/api";
import { apiBaseUrl, apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { formatApiClosingDay, formatApiDeliveryMethods, formatPaymentType, formatPriceCategory } from "@/lib/api/format";
import { formatCurrencyJPY } from "@/lib/format";
import { alphaNumericInputAttributes, numericInputAttributes } from "@/lib/inputAttributes";

type TabKey = "customers" | "stores" | "prices" | "deliveries" | "details" | "summary";

type DeliveryDraft = {
  deliveryDays: string[];
  quantities: Record<string, string[]>;
};

type DeliveryDraftUpdater = DeliveryDraft | ((current: DeliveryDraft) => DeliveryDraft);
type SaveStatus = "idle" | "dirty" | "saving" | "saved";

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
  { value: 10, label: "10日" },
  { value: 15, label: "15日" },
  { value: 20, label: "20日" },
  { value: 31, label: "月末" },
];

const deliveryMethodOptions: { value: ApiDeliveryMethod; label: string }[] = [
  { value: "gmail_pdf", label: "PDF" },
  { value: "fax", label: "FAX" },
  { value: "postal", label: "郵送" },
  { value: "line", label: "LINE" },
  { value: "hand_delivery", label: "手渡し" },
];

const maxDeliveryMethodCount = 3;
const deliveryEntryCount = 20;

function createEmptyDeliveryEntries() {
  return Array.from({ length: deliveryEntryCount }, () => "");
}

function createEmptyDeliveryDraft(): DeliveryDraft {
  return {
    deliveryDays: createEmptyDeliveryEntries(),
    quantities: {},
  };
}

const emptyCustomer = {
  customer_code: "",
  name: "",
  honorific: "御中",
  payment_type: "bank_transfer",
  delivery_method: "gmail_pdf" as ApiDeliveryMethod,
  delivery_methods: ["gmail_pdf"] as ApiDeliveryMethod[],
  closing_day: 31,
  postal_code: "",
  address: "",
  email: "",
  line_name: "",
  bank_transfer_name_1: "",
  bank_transfer_name_2: "",
  bank_transfer_name_3: "",
  note: "",
};

const emptyStore = {
  customer_id: 0,
  name: "",
  display_order: "",
  note: "",
};

const emptyPrice = {
  customer_id: 0,
  store_id: "",
  item_name: "",
  unit_price: "",
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
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, DeliveryDraft>>({});
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const selectedCustomerStores = useMemo(() => getSortedCustomerStores(stores, selectedCustomerId), [stores, selectedCustomerId]);
  const shouldShowTargetSelector = tabsWithTargetSelector.includes(activeTab);

  const updateDeliveryDraft = useCallback((storeId: number, updater: DeliveryDraftUpdater) => {
    setDeliveryDrafts((current) => {
      const deliveryDraftKey = getDeliveryDraftKey(selectedCustomerId, storeId, billingMonth);
      const currentDraft = current[deliveryDraftKey] ?? createEmptyDeliveryDraft();
      const nextDraft = typeof updater === "function" ? updater(currentDraft) : updater;
      return { ...current, [deliveryDraftKey]: nextDraft };
    });
  }, [billingMonth, selectedCustomerId]);

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
        store_id: selectedStoreId || null,
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

  useEffect(() => {
    if (!selectedCustomerId || !deliveryData) return;

    const storeIds = selectedStoreId ? [selectedStoreId] : selectedCustomerStores.map((store) => store.id);
    const restoredDrafts = buildDeliveryDraftsFromRows({
      rows: deliveryData.rows,
      prices,
      customerId: selectedCustomerId,
      storeIds,
    });

    setDeliveryDrafts((current) => {
      const next = { ...current };
      storeIds.forEach((storeId) => {
        next[getDeliveryDraftKey(selectedCustomerId, storeId, billingMonth)] = restoredDrafts[storeId] ?? createEmptyDeliveryDraft();
      });
      return next;
    });
  }, [billingMonth, deliveryData, prices, selectedCustomerId, selectedCustomerStores, selectedStoreId]);

  async function runAction(action: () => Promise<void>, doneMessage: string) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(doneMessage);
      return true;
    } catch (exception) {
      setError(toErrorMessage(exception));
      return false;
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
          stores={selectedCustomerStores}
          deliveryDrafts={deliveryDrafts}
          onDraftChange={updateDeliveryDraft}
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
          selectedStoreId={selectedStoreId}
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
  const customerStores = useMemo(() => getSortedCustomerStores(stores, selectedCustomerId), [stores, selectedCustomerId]);
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
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiCustomer | null>(null);
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return customers;
    return customers.filter((customer) => {
      const text = normalizeSearchText(
        `${customer.customer_code} ${customer.name} ${customer.email ?? ""} ${customer.line_name ?? ""} ${customer.bank_transfer_name ?? ""} ${normalizeDeliveryMethods(customer.delivery_methods, customer.delivery_method).join(" ")} ${customer.note ?? ""}`,
      );
      return text.includes(normalizedQuery);
    });
  }, [customers, query]);

  async function submit() {
    const { bank_transfer_name_1, bank_transfer_name_2, bank_transfer_name_3, ...customerForm } = form;
    const deliveryMethods = normalizeDeliveryMethods(form.delivery_methods, form.delivery_method);
    const body = {
      ...customerForm,
      delivery_method: deliveryMethods[0],
      delivery_methods: deliveryMethods,
      closing_day: Number(form.closing_day),
      bank_transfer_name: form.payment_type === "bank_transfer"
        ? normalizeBankTransferNames([bank_transfer_name_1, bank_transfer_name_2, bank_transfer_name_3])
        : "",
    };
    if (editingId) {
      await apiPut<ApiCustomer>("/customers.php", { id: editingId, ...body });
    } else {
      await apiPost<ApiCustomer>("/customers.php", body);
    }
    setForm(emptyCustomer);
    setEditingId(null);
    setIsFormOpen(false);
    await onReload();
  }

  function openCreateForm() {
    setForm(emptyCustomer);
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEditForm(customer: ApiCustomer) {
    const bankTransferNames = splitBankTransferNames(customer.bank_transfer_name);
    const deliveryMethods = normalizeDeliveryMethods(customer.delivery_methods, customer.delivery_method);
    setEditingId(customer.id);
    setForm({
      customer_code: customer.customer_code,
      name: customer.name,
      honorific: customer.honorific,
      payment_type: customer.payment_type,
      delivery_method: deliveryMethods[0],
      delivery_methods: deliveryMethods,
      closing_day: customer.closing_day,
      postal_code: customer.postal_code ?? "",
      address: customer.address ?? "",
      email: customer.email ?? "",
      line_name: customer.line_name ?? "",
      bank_transfer_name_1: bankTransferNames[0] ?? "",
      bank_transfer_name_2: bankTransferNames[1] ?? "",
      bank_transfer_name_3: bankTransferNames[2] ?? "",
      note: customer.note ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm(emptyCustomer);
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await runAction(async () => {
      await apiDelete("/customers.php", { id: deleteTarget.id });
      await onReload();
    }, "顧客を削除しました。");
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold">顧客マスタ</h3>
          <p className="mt-1 text-xs text-slate-500">顧客登録・編集はボタンから開きます。</p>
        </div>
        <button type="button" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={openCreateForm}>
          顧客を追加
        </button>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8">
          <div className="surface w-full max-w-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h3 className="font-bold">{editingId ? "顧客編集" : "顧客登録"}</h3>
              <button type="button" className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={closeForm}>
                閉じる
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <label className="block text-sm font-semibold text-slate-700">
                  顧客コード
                  <input
                    {...alphaNumericInputAttributes}
                    className="field mt-1 w-full font-normal"
                    value={form.customer_code}
                    onChange={(event) => setForm({ ...form, customer_code: normalizeAlphaNumericInput(event.target.value) })}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  請求先名
                  <input className="field mt-1 w-full font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  支払区分
                  <select
                    className="field mt-1 w-full font-normal"
                    value={form.payment_type}
                    onChange={(event) => setForm({
                      ...form,
                      payment_type: event.target.value,
                      bank_transfer_name_1: event.target.value === "bank_transfer" ? form.bank_transfer_name_1 : "",
                      bank_transfer_name_2: event.target.value === "bank_transfer" ? form.bank_transfer_name_2 : "",
                      bank_transfer_name_3: event.target.value === "bank_transfer" ? form.bank_transfer_name_3 : "",
                    })}
                  >
                    <option value="bank_transfer">振込</option>
                    <option value="cash">現金</option>
                  </select>
                </label>
                <div className="text-sm font-semibold text-slate-700">
                  請求書送付方法
                  <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {deliveryMethodOptions.map((option) => {
                      const checked = form.delivery_methods.includes(option.value);
                      const disabled = !checked && form.delivery_methods.length >= maxDeliveryMethodCount;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal ${
                            checked ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-700"
                          } ${disabled ? "opacity-45" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setForm((current) => ({
                              ...current,
                              ...toggleDeliveryMethod(current.delivery_methods, option.value),
                            }))}
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
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
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    振込名義1
                    <input
                      className="field mt-1 w-full font-normal"
                      value={form.bank_transfer_name_1}
                      onChange={(event) => setForm({ ...form, bank_transfer_name_1: event.target.value })}
                      placeholder="例: アオヤマサロン"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    振込名義2
                    <input
                      className="field mt-1 w-full font-normal"
                      value={form.bank_transfer_name_2}
                      onChange={(event) => setForm({ ...form, bank_transfer_name_2: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    振込名義3
                    <input
                      className="field mt-1 w-full font-normal"
                      value={form.bank_transfer_name_3}
                      onChange={(event) => setForm({ ...form, bank_transfer_name_3: event.target.value })}
                    />
                  </label>
                </div>
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
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={closeForm}>
                  キャンセル
                </button>
                <button type="button" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => runAction(submit, "顧客を保存しました。")}>
                  {editingId ? "更新" : "登録"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
          <div className="surface w-full max-w-md p-5 shadow-xl">
            <h3 className="font-bold">顧客を削除しますか？</h3>
            <div className="mt-3 rounded-md bg-rose-50 px-3 py-3 text-sm text-rose-800">
              <p className="font-semibold">{deleteTarget.customer_code} {deleteTarget.name}</p>
              <p className="mt-1 text-xs">この操作は取り消せません。</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </button>
              <button type="button" className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDelete}>
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="table-scroll">
        <div className="mb-3 flex flex-col gap-2 pl-3 pt-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="顧客コード・請求先名・メール・振込名義で検索"
            className="field w-full sm:max-w-56"
          />
          <p className="pl-3 text-xs text-slate-500">表示件数: {filteredCustomers.length} / {customers.length}</p>
        </div>
        <table className="min-w-[1360px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr><th className="px-4 py-3">コード</th><th className="px-4 py-3">請求先</th><th className="px-4 py-3">区分</th><th className="px-4 py-3">振込名義</th><th className="px-4 py-3">送付</th><th className="px-4 py-3">締め日欄</th><th className="px-4 py-3">備考</th><th className="px-4 py-3">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3 font-semibold">{customer.customer_code}</td>
                <td className="px-4 py-3">{customer.name}</td>
                <td className="px-4 py-3">{formatPaymentType(customer.payment_type)}</td>
                <td className="px-4 py-3">{customer.payment_type === "bank_transfer" ? customer.bank_transfer_name ?? "-" : "-"}</td>
                <td className="px-4 py-3">{formatApiDeliveryMethods(normalizeDeliveryMethods(customer.delivery_methods, customer.delivery_method))}</td>
                <td className="px-4 py-3">{formatApiClosingDay(Number(customer.closing_day))}</td>
                <td className="max-w-[320px] px-4 py-3 text-slate-600">{customer.note ?? "-"}</td>
                <td className="space-x-2 px-4 py-3">
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => openEditForm(customer)}>編集</button>
                  <button type="button" className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => setDeleteTarget(customer)}>削除</button>
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
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState(emptyStore);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const customerOptions = useMemo<CustomerSearchOption<number>[]>(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customer_code} ${customer.name}`,
      keywords: `${customer.name} ${customer.customer_code} ${customer.email ?? ""} ${customer.line_name ?? ""}`,
    }));
  }, [customers]);

  function updateForm(nextForm: typeof emptyStore) {
    setForm(nextForm);
    setSaveStatus((current) => current === "saving" ? current : "dirty");
  }

  async function submit() {
    const body = { ...form, customer_id: Number(form.customer_id), display_order: Number(form.display_order || 0) };
    if (editingId) {
      await apiPut<ApiStore>("/stores.php", { id: editingId, ...body });
    } else {
      await apiPost<ApiStore>("/stores.php", body);
    }
    setForm(emptyStore);
    setEditingId(null);
    await onReload();
  }

  async function handleSave() {
    setSaveStatus("saving");
    const saved = await runAction(submit, "店舗を保存しました。");
    setSaveStatus(saved ? "saved" : "dirty");
  }

  return (
    <MasterTablePanel title="店舗登録・編集">
      <div className="surface p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <CustomerSearchField
            label="顧客"
            value={form.customer_id}
            options={customerOptions}
            onChange={(customerId) => updateForm({ ...form, customer_id: customerId })}
            emptyOption={{ value: 0, label: "顧客選択" }}
            className="text-slate-700"
          />
          <label className="block text-sm font-semibold text-slate-700">
            店舗名
            <input className="field mt-1 w-full font-normal" value={form.name} onChange={(event) => updateForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            表示順
            <input
              className="field mt-1 w-full font-normal"
              {...numericInputAttributes}
              value={form.display_order}
              onChange={(event) => updateForm({ ...form, display_order: normalizeIntegerInput(event.target.value) })}
            />
          </label>
          <SaveButton status={saveStatus} idleLabel={editingId ? "更新" : "登録"} onClick={handleSave} />
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
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => { setEditingId(store.id); setForm({ customer_id: store.customer_id, name: store.name, display_order: String(store.display_order), note: store.note ?? "" }); setSaveStatus("idle"); }}>編集</button>
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
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState(emptyPrice);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const candidateStores = stores.filter((store) => store.customer_id === Number(form.customer_id));
  const customerOptions = useMemo<CustomerSearchOption<number>[]>(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customer_code} ${customer.name}`,
      keywords: `${customer.name} ${customer.customer_code} ${customer.email ?? ""} ${customer.line_name ?? ""}`,
    }));
  }, [customers]);

  function updateForm(nextForm: typeof emptyPrice) {
    setForm(nextForm);
    setSaveStatus((current) => current === "saving" ? current : "dirty");
  }

  async function submit() {
    const body = {
      ...form,
      customer_id: Number(form.customer_id),
      store_id: form.store_id === "" ? null : Number(form.store_id),
      unit_price: Number(form.unit_price || 0),
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

  async function handleSave() {
    setSaveStatus("saving");
    const saved = await runAction(submit, "単価を保存しました。");
    setSaveStatus(saved ? "saved" : "dirty");
  }

  return (
    <MasterTablePanel title="顧客別単価登録・編集">
      <div className="surface p-5">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <CustomerSearchField
            label="顧客"
            value={form.customer_id}
            options={customerOptions}
            onChange={(customerId) => updateForm({ ...form, customer_id: customerId, store_id: "" })}
            emptyOption={{ value: 0, label: "顧客選択" }}
            className="text-slate-700"
          />
          <label className="block text-sm font-semibold text-slate-700">
            店舗
            <select className="field mt-1 w-full font-normal" value={form.store_id} onChange={(event) => updateForm({ ...form, store_id: event.target.value })}>
              <option value="">全店舗共通</option>
              {candidateStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            商品名
            <input className="field mt-1 w-full font-normal" value={form.item_name} onChange={(event) => updateForm({ ...form, item_name: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            単価
            <input
              className="field mt-1 w-full font-normal"
              {...numericInputAttributes}
              value={form.unit_price}
              onChange={(event) => updateForm({ ...form, unit_price: normalizeIntegerInput(event.target.value) })}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            区分
            <select className="field mt-1 w-full font-normal" value={form.category} onChange={(event) => updateForm({ ...form, category: event.target.value as PriceCategory })}>
              <option value="product">商品</option>
              <option value="delivery_fee">配達料</option>
              <option value="collection">回収</option>
              <option value="other_fee">その他手数料</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            開始日
            <input className="field mt-1 w-full font-normal" type="date" value={form.start_date} onChange={(event) => updateForm({ ...form, start_date: event.target.value })} />
          </label>
          <SaveButton status={saveStatus} idleLabel={editingId ? "更新" : "登録"} onClick={handleSave} />
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
                  <button type="button" className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold" onClick={() => { setEditingId(price.id); setForm({ customer_id: price.customer_id, store_id: price.store_id ? String(price.store_id) : "", item_name: price.item_name, unit_price: String(price.unit_price), category: price.category, start_date: price.start_date, end_date: price.end_date ?? "", note: price.note ?? "" }); setSaveStatus("idle"); }}>編集</button>
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
  stores,
  deliveryDrafts,
  onDraftChange,
  onReload,
  runAction,
}: {
  selectedCustomerId: number;
  selectedStoreId: number;
  billingMonth: string;
  prices: ApiPrice[];
  stores: ApiStore[];
  deliveryDrafts: Record<string, DeliveryDraft>;
  onDraftChange: (storeId: number, updater: DeliveryDraftUpdater) => void;
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<boolean>;
}) {
  const [storeSaveStatuses, setStoreSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [allSaveStatus, setAllSaveStatus] = useState<SaveStatus>("idle");
  const deliveryStores = useMemo(() => {
    if (selectedStoreId) return stores.filter((store) => store.id === selectedStoreId);
    return stores;
  }, [selectedStoreId, stores]);

  useEffect(() => {
    setStoreSaveStatuses({});
    setAllSaveStatus("idle");
  }, [billingMonth, selectedCustomerId, selectedStoreId]);

  function getStoreSaveKey(storeId: number) {
    return getDeliveryDraftKey(selectedCustomerId, storeId, billingMonth);
  }

  function setStoreSaveStatus(storeId: number, status: SaveStatus) {
    setStoreSaveStatuses((current) => ({ ...current, [getStoreSaveKey(storeId)]: status }));
  }

  function markStoreDirty(storeId: number) {
    setStoreSaveStatus(storeId, "dirty");
    setAllSaveStatus((current) => current === "saving" ? current : "dirty");
  }

  function handleUserDraftChange(storeId: number, updater: DeliveryDraftUpdater) {
    markStoreDirty(storeId);
    onDraftChange(storeId, updater);
  }

  async function submit() {
    const storeInputs = deliveryStores.map((store) => {
      const draft = deliveryDrafts[getDeliveryDraftKey(selectedCustomerId, store.id, billingMonth)] ?? createEmptyDeliveryDraft();
      return {
        store,
        draft,
        prices: getVisibleDeliveryPrices(prices, selectedCustomerId, store.id),
      };
    });

    const storesToSave = selectedStoreId ? storeInputs : storeInputs.filter(({ draft }) => hasDeliveryDraftInput(draft));
    if (storesToSave.length === 0) {
      throw new Error("保存対象の納品入力がありません。");
    }

    for (const storeInput of storesToSave) {
      await saveDeliveryStoreInput({
        customerId: selectedCustomerId,
        storeId: storeInput.store.id,
        billingMonth,
        draft: storeInput.draft,
        prices: storeInput.prices,
      });
    }
    await onReload();
  }

  async function handleSaveAll() {
    setAllSaveStatus("saving");
    deliveryStores.forEach((store) => {
      if (hasDeliveryDraftInput(deliveryDrafts[getDeliveryDraftKey(selectedCustomerId, store.id, billingMonth)] ?? createEmptyDeliveryDraft())) {
        setStoreSaveStatus(store.id, "saving");
      }
    });
    const saved = await runAction(submit, "全店舗の納品データを保存しました。");
    setAllSaveStatus(saved ? "saved" : "dirty");
    deliveryStores.forEach((store) => {
      if (hasDeliveryDraftInput(deliveryDrafts[getDeliveryDraftKey(selectedCustomerId, store.id, billingMonth)] ?? createEmptyDeliveryDraft())) {
        setStoreSaveStatus(store.id, saved ? "saved" : "dirty");
      }
    });
  }

  async function submitStore(store: ApiStore) {
    const draft = deliveryDrafts[getDeliveryDraftKey(selectedCustomerId, store.id, billingMonth)] ?? createEmptyDeliveryDraft();
    await saveDeliveryStoreInput({
      customerId: selectedCustomerId,
      storeId: store.id,
      billingMonth,
      draft,
      prices: getVisibleDeliveryPrices(prices, selectedCustomerId, store.id),
    });
    await onReload();
  }

  async function handleSaveStore(store: ApiStore) {
    setStoreSaveStatus(store.id, "saving");
    const saved = await runAction(() => submitStore(store), `${store.name}の納品データを保存しました。`);
    setStoreSaveStatus(store.id, saved ? "saved" : "dirty");
    setAllSaveStatus((current) => current === "saving" ? current : saved ? current : "dirty");
  }

  if (!selectedCustomerId) {
    return <div className="surface p-5 text-sm text-slate-600">顧客を選択してください。</div>;
  }

  if (deliveryStores.length === 0) {
    return <div className="surface p-5 text-sm text-slate-600">この顧客の店舗を店舗マスタで登録してください。</div>;
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4 text-sm text-slate-600">
        納品日は請求月内の日だけを数字で入力します。空欄は集計対象外、数量が空欄の商品は保存しません。
      </div>
      {deliveryStores.map((store) => {
        const draft = deliveryDrafts[getDeliveryDraftKey(selectedCustomerId, store.id, billingMonth)] ?? createEmptyDeliveryDraft();
        return (
          <DeliveryEntryStoreCard
            key={store.id}
            store={store}
            selectedCustomerId={selectedCustomerId}
            billingMonth={billingMonth}
            prices={prices}
            draft={draft}
            onDraftChange={onDraftChange}
            onUserDraftChange={handleUserDraftChange}
            saveStatus={storeSaveStatuses[getStoreSaveKey(store.id)] ?? "idle"}
            onSave={() => handleSaveStore(store)}
          />
        );
      })}
      {deliveryStores.length > 1 ? (
        <SaveButton status={allSaveStatus} idleLabel="全店舗分を保存" disabled={!selectedCustomerId} onClick={handleSaveAll} />
      ) : null}
    </div>
  );
}

function DeliveryEntryStoreCard({
  store,
  selectedCustomerId,
  billingMonth,
  prices,
  draft,
  onDraftChange,
  onUserDraftChange,
  saveStatus,
  onSave,
}: {
  store: ApiStore;
  selectedCustomerId: number;
  billingMonth: string;
  prices: ApiPrice[];
  draft: DeliveryDraft;
  onDraftChange: (storeId: number, updater: DeliveryDraftUpdater) => void;
  onUserDraftChange: (storeId: number, updater: DeliveryDraftUpdater) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
}) {
  const visiblePrices = useMemo(() => {
    return getVisibleDeliveryPrices(prices, selectedCustomerId, store.id);
  }, [prices, selectedCustomerId, store.id]);
  const productPrices = useMemo(() => visiblePrices.filter((price) => price.category === "product"), [visiblePrices]);
  const deliveryFee = useMemo(() => visiblePrices.find((price) => price.category === "delivery_fee"), [visiblePrices]);
  const collectionFee = useMemo(() => visiblePrices.find((price) => price.category === "collection"), [visiblePrices]);
  const deliveryDays = ensureDeliveryEntryCount(draft.deliveryDays);
  const quantities = draft.quantities;
  const productQuantitiesByDate = deliveryDays.map((day, index) => {
    if (!day) return false;
    return productPrices.some((price) => Number(ensureDeliveryEntryCount(quantities[String(price.id)])[index] || 0) > 0);
  });

  useEffect(() => {
    onDraftChange(store.id, (currentDraft) => {
      const nextQuantities = { ...currentDraft.quantities };
      productPrices.forEach((price) => {
        nextQuantities[String(price.id)] = ensureDeliveryEntryCount(nextQuantities[String(price.id)]);
      });
      return {
        deliveryDays: ensureDeliveryEntryCount(currentDraft.deliveryDays),
        quantities: nextQuantities,
      };
    });
  }, [onDraftChange, productPrices, store.id]);

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">{store.name}</h3>
        <SaveButton status={saveStatus} idleLabel="この店舗を保存" onClick={onSave} />
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
                    {...numericInputAttributes}
                    placeholder="日"
                    value={day}
                    onChange={(event) => {
                      const nextDeliveryDays = deliveryDays.map((item, itemIndex) => itemIndex === index ? normalizeDayInput(event.target.value, billingMonth) : item);
                      onUserDraftChange(store.id, (currentDraft) => ({ ...currentDraft, deliveryDays: nextDeliveryDays }));
                    }}
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
                        {...numericInputAttributes}
                        value={value}
                        onChange={(event) => {
                          const nextRow = row.map((item, itemIndex) => itemIndex === index ? normalizeIntegerInput(event.target.value) : item);
                          onUserDraftChange(store.id, (currentDraft) => ({
                            ...currentDraft,
                            quantities: { ...currentDraft.quantities, [String(price.id)]: nextRow },
                          }));
                        }}
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
                {deliveryDays.map((day, index) => <td key={index} className="px-4 py-3 text-center">{day && productQuantitiesByDate[index] ? 1 : ""}</td>)}
                <td className="px-4 py-3 text-right font-semibold">{productQuantitiesByDate.filter(Boolean).length}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyJPY(productQuantitiesByDate.filter(Boolean).length * Number(deliveryFee.unit_price))}</td>
              </tr>
            ) : null}
            {collectionFee ? (
              <tr className="bg-amber-50/50">
                <td className="px-4 py-3 font-semibold">{collectionFee.item_name}</td>
                <td className="px-4 py-3 text-right">{formatCurrencyJPY(Number(collectionFee.unit_price))}</td>
                {deliveryDays.map((day, index) => <td key={index} className="px-4 py-3 text-center">{day && !productQuantitiesByDate[index] ? 1 : ""}</td>)}
                <td className="px-4 py-3 text-right font-semibold">{deliveryDays.filter((day, index) => day && !productQuantitiesByDate[index]).length}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrencyJPY(deliveryDays.filter((day, index) => day && !productQuantitiesByDate[index]).length * Number(collectionFee.unit_price))}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
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
          <SummaryLine label="回収・その他" value={summary?.other_fee_total ?? 0} />
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

function getSortedCustomerStores(stores: ApiStore[], customerId: number) {
  return stores
    .filter((store) => store.customer_id === customerId)
    .sort((left, right) => left.display_order - right.display_order || left.id - right.id);
}

function getVisibleDeliveryPrices(prices: ApiPrice[], customerId: number, storeId: number) {
  return prices.filter((price) => price.customer_id === customerId && (price.store_id === storeId || price.store_id === null));
}

function hasDeliveryDraftInput(draft: DeliveryDraft) {
  const deliveryDays = ensureDeliveryEntryCount(draft.deliveryDays);
  const hasDeliveryDay = deliveryDays.some(Boolean);
  const hasQuantity = Object.values(draft.quantities).some((row) => ensureDeliveryEntryCount(row).some(Boolean));
  return hasDeliveryDay || hasQuantity;
}

function buildDeliveryDraftsFromRows({
  rows,
  prices,
  customerId,
  storeIds,
}: {
  rows: DeliveryRow[];
  prices: ApiPrice[];
  customerId: number;
  storeIds: number[];
}) {
  const drafts: Record<number, DeliveryDraft> = {};
  const targetStoreIds = new Set(storeIds);
  storeIds.forEach((storeId) => {
    drafts[storeId] = createEmptyDeliveryDraft();
  });

  const datesByStore = new Map<number, string[]>();
  rows.forEach((row) => {
    const storeId = Number(row.store_id);
    if (!targetStoreIds.has(storeId) || !row.delivery_date) return;

    const dates = datesByStore.get(storeId) ?? [];
    if (!dates.includes(row.delivery_date) && dates.length < deliveryEntryCount) {
      dates.push(row.delivery_date);
    }
    datesByStore.set(storeId, dates);
  });

  datesByStore.forEach((dates, storeId) => {
    const draft = drafts[storeId] ?? createEmptyDeliveryDraft();
    dates.forEach((date, index) => {
      draft.deliveryDays[index] = String(Number(date.slice(8, 10)));
    });
    drafts[storeId] = draft;
  });

  rows.forEach((row) => {
    const storeId = Number(row.store_id);
    if (!targetStoreIds.has(storeId) || row.category !== "product" || !row.delivery_date) return;

    const dateIndex = datesByStore.get(storeId)?.indexOf(row.delivery_date) ?? -1;
    if (dateIndex < 0 || dateIndex >= deliveryEntryCount) return;

    const price = findMatchingProductPrice(prices, row, customerId, storeId);
    if (!price) return;

    const draft = drafts[storeId] ?? createEmptyDeliveryDraft();
    const quantityKey = String(price.id);
    const quantityRow = ensureDeliveryEntryCount(draft.quantities[quantityKey]);
    const currentQuantity = Number(quantityRow[dateIndex] || 0);
    const nextQuantity = currentQuantity + Number(row.quantity || 0);
    quantityRow[dateIndex] = String(nextQuantity);
    draft.quantities[quantityKey] = quantityRow;
    drafts[storeId] = draft;
  });

  return drafts;
}

function findMatchingProductPrice(prices: ApiPrice[], row: DeliveryRow, customerId: number, storeId: number) {
  const candidates = getVisibleDeliveryPrices(prices, customerId, storeId).filter((price) => (
    price.category === "product" &&
    price.item_name === row.item_name
  ));
  const exactCandidates = candidates.filter((price) => Number(price.unit_price) === Number(row.unit_price));
  return (
    exactCandidates.find((price) => price.store_id === storeId) ??
    exactCandidates.find((price) => price.store_id === null) ??
    candidates.find((price) => price.store_id === storeId) ??
    candidates.find((price) => price.store_id === null)
  );
}

async function saveDeliveryStoreInput({
  customerId,
  storeId,
  billingMonth,
  draft,
  prices,
}: {
  customerId: number;
  storeId: number;
  billingMonth: string;
  draft: DeliveryDraft;
  prices: ApiPrice[];
}) {
  const productPrices = prices.filter((price) => price.category === "product");
  const deliveryFee = prices.find((price) => price.category === "delivery_fee");
  const collectionFee = prices.find((price) => price.category === "collection");
  const deliveryDays = ensureDeliveryEntryCount(draft.deliveryDays);
  const quantities = draft.quantities;
  const deliveryDates = deliveryDays.map((day) => formatDeliveryDateFromDay(billingMonth, day));

  await apiPost("/deliveries.php", {
    customer_id: customerId,
    store_id: storeId,
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
    collection_fee: collectionFee
      ? { item_name: collectionFee.item_name, unit_price: Number(collectionFee.unit_price) }
      : null,
  });
}

function normalizeIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeAlphaNumericInput(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function splitBankTransferNames(value?: string | null) {
  return (value ?? "")
    .split(/[,\u3001]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function normalizeBankTransferNames(values: string[]) {
  return values
    .map((name) => name.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeDeliveryMethods(
  values: ApiCustomer["delivery_methods"] | ApiDeliveryMethod[],
  fallback: ApiDeliveryMethod,
): ApiDeliveryMethod[] {
  const rawMethods = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(",")
      : [];
  const methods = rawMethods
    .map((method) => method.trim())
    .filter((method): method is ApiDeliveryMethod => isApiDeliveryMethod(method));
  return (methods.length > 0 ? methods : [fallback]).slice(0, maxDeliveryMethodCount);
}

function toggleDeliveryMethod(current: ApiDeliveryMethod[], method: ApiDeliveryMethod) {
  const nextMethods = current.includes(method)
    ? current.filter((item) => item !== method)
    : [...current, method].slice(0, maxDeliveryMethodCount);
  const deliveryMethods = nextMethods.length > 0 ? nextMethods : [method];
  return {
    delivery_method: deliveryMethods[0],
    delivery_methods: deliveryMethods,
  };
}

function isApiDeliveryMethod(value: string): value is ApiDeliveryMethod {
  return deliveryMethodOptions.some((option) => option.value === value);
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

function getDeliveryDraftKey(customerId: number, storeId: number, billingMonth: string) {
  return `${customerId}:${storeId}:${billingMonth}`;
}

function SummaryPanel({
  selectedCustomerId,
  selectedStoreId,
  billingMonth,
  summary,
  onReload,
  runAction,
}: {
  selectedCustomerId: number;
  selectedStoreId: number;
  billingMonth: string;
  summary: InvoiceSummary | null;
  onReload: () => Promise<void>;
  runAction: (action: () => Promise<void>, doneMessage: string) => Promise<boolean>;
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setSaveStatus("idle");
  }, [billingMonth, selectedCustomerId, selectedStoreId]);

  async function saveSummary() {
    await apiPost("/invoice-summary.php", {
      customer_id: selectedCustomerId,
      store_id: selectedStoreId || null,
      billing_month: billingMonth,
    });
    await onReload();
  }

  async function handleSave() {
    setSaveStatus("saving");
    const saved = await runAction(saveSummary, "請求集計を保存しました。");
    setSaveStatus(saved ? "saved" : "dirty");
  }

  return (
    <div className="surface max-w-xl p-5">
      <h3 className="font-bold">請求集計</h3>
      <div className="mt-4 space-y-2 text-sm">
        <SummaryLine label="商品合計" value={summary?.product_total ?? 0} />
        <SummaryLine label="配達料" value={summary?.delivery_fee_total ?? 0} />
        <SummaryLine label="回収・その他" value={summary?.other_fee_total ?? 0} />
        <SummaryLine label="税抜合計" value={summary?.subtotal ?? 0} />
        <SummaryLine label="消費税" value={summary?.tax ?? 0} />
        <SummaryLine label="税込合計" value={summary?.total ?? 0} strong />
      </div>
      <SaveButton status={saveStatus} idleLabel="集計を保存" disabled={!selectedCustomerId} className="mt-5" onClick={handleSave} />
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

function SaveButton({
  status,
  idleLabel,
  disabled = false,
  className = "",
  onClick,
}: {
  status: SaveStatus;
  idleLabel: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const isSaving = status === "saving";
  const isSaved = status === "saved";
  const buttonLabel = isSaving ? "保存中..." : isSaved ? "保存済み" : idleLabel;
  const statusLabel = status === "dirty" ? "未保存の変更あり" : isSaved ? "保存済み" : "";
  const buttonClassName = [
    "rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed",
    isSaved ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-teal-700 text-white hover:bg-teal-800",
    isSaving ? "opacity-60" : "",
    disabled ? "bg-slate-300 text-white hover:bg-slate-300" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" disabled={disabled || isSaving || isSaved} className={buttonClassName} onClick={onClick}>
        {buttonLabel}
      </button>
      {statusLabel ? (
        <span className={isSaved ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-amber-700"}>
          {statusLabel}
        </span>
      ) : null}
    </div>
  );
}

function toErrorMessage(exception: unknown) {
  return exception instanceof Error ? exception.message : "処理に失敗しました。";
}
