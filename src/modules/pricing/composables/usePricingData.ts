import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  fetchAccountIdsByCustomerFilter,
  fetchAccountIdsByKeyword,
  fetchAccountIdsByPriceType,
  fetchAccountsBasic,
  fetchCurrentPrices,
  fetchCustomersBasic,
  fetchPriceHistory,
  fetchPriceRelatedData,
  fetchProductsBasic,
  type PriceFilters,
} from '../api';
import type {
  CustomerBasic,
  ProductBasic,
  CustomerAccount,
  PriceWideRow,
  PriceCell,
  PriceHistoryItem,
  OptionsCachePayload,
} from '../types';

const OPTIONS_CACHE_KEY = 'price_options_cache';
const OPTIONS_CACHE_TTL = 5 * 60 * 1000;
const CACHE_SCHEMA_VERSION = 2;

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* QuotaExceededError or private browsing - degrade to in-memory only */
  }
}

function safeStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export function usePricingData(filters: { value: PriceFilters }) {
  const rows = ref<Record<string, unknown>[]>([]);
  const loading = ref(false);
  const customers = ref<CustomerBasic[]>([]);
  const products = ref<ProductBasic[]>([]);
  const accountsByCustomer = ref<Record<string, CustomerAccount[]>>({});
  const levelOptions = ref<string[]>([]);
  const regionOptions = ref<string[]>([]);
  const priceTypeOptions = ref<string[]>([]);
  const cacheStats = ref({ lastUpdate: 0, hitCount: 0, missCount: 0, cacheSize: 0 });

  const wideRows = computed<PriceWideRow[]>(() => {
    const byKey = new Map<string, PriceWideRow>();
    for (const r of rows.value) {
      const key = `${r.account_id}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          company: (r.company as string) || '',
          account_name: (r.account_name as string) || '',
          level: (r.level as string) || '',
          region: (r.region as string) || '',
          price_type: (r.price_type as string) || '',
          account_id: r.account_id as number,
          customer_id: (r.customer_id as number) ?? null,
          _cells: {},
        });
      }
      const row = byKey.get(key)!;
      const spec = (r.product_spec as string) || (r.product_name as string) || String(r.product_id);
      row._cells[spec] = { price: r.price as number | null, product_id: r.product_id as number };
    }
    return [...byKey.values()];
  });

  const productColumns = computed<string[]>(() => {
    return [...products.value]
      .map((p) => p.spec || p.name || String(p.id))
      .filter(Boolean)
      .sort();
  });

  const assignOptions = (data: Partial<OptionsCachePayload>) => {
    customers.value = (data.customers || []) as CustomerBasic[];
    products.value = (data.products || []) as ProductBasic[];
    accountsByCustomer.value = (data.accountsByCustomer || {}) as Record<string, CustomerAccount[]>;
    levelOptions.value = data.levelOptions || [];
    regionOptions.value = data.regionOptions || [];
    priceTypeOptions.value = data.priceTypeOptions || [];
  };

  const invalidateOptionsCache = () => safeStorageRemove(OPTIONS_CACHE_KEY);

  async function loadOptions(force = false) {
    const now = Date.now();
    if (!force) {
      try {
        const cached = safeStorageGet(OPTIONS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<OptionsCachePayload>;
          if (
            parsed.schemaVersion === CACHE_SCHEMA_VERSION &&
            parsed.ts &&
            now - parsed.ts < OPTIONS_CACHE_TTL
          ) {
            assignOptions(parsed);
            cacheStats.value.hitCount += 1;
            return;
          }
        }
      } catch {
        safeStorageRemove(OPTIONS_CACHE_KEY);
      }
    }

    try {
      const [{ data: cs }, { data: ps }, { data: accounts }] = await Promise.all([
        fetchCustomersBasic(),
        fetchProductsBasic(),
        fetchAccountsBasic(),
      ]);
      const customersData = (cs || []) as CustomerBasic[];
      const productsData = (ps || []) as ProductBasic[];
      const accData = (accounts || []) as CustomerAccount[];

      const byCustomer: Record<string, CustomerAccount[]> = {};
      accData.forEach((a) => {
        const key = String(a.customer_id || '');
        if (!key) return;
        if (!byCustomer[key]) byCustomer[key] = [];
        byCustomer[key].push(a);
      });

      const payload: OptionsCachePayload = {
        customers: customersData,
        products: productsData,
        accountsByCustomer: byCustomer,
        levelOptions: [...new Set(customersData.map((c) => c.level).filter((v): v is string => !!v))].sort(),
        regionOptions: [...new Set(customersData.map((c) => c.region).filter((v): v is string => !!v))].sort(),
        priceTypeOptions: [...new Set(accData.map((a) => a.price_type).filter((v): v is string => !!v))].sort(),
        ts: now,
        schemaVersion: CACHE_SCHEMA_VERSION,
      };
      assignOptions(payload);
      cacheStats.value.missCount += 1;
      safeStorageSet(OPTIONS_CACHE_KEY, JSON.stringify(payload));
    } catch (e: unknown) {
      ElMessage.error((e as Error)?.message || '加载选项数据失败');
    }
  }

  async function fetchData() {
    loading.value = true;
    try {
      const f = filters.value;
      let accountIds: number[] | null = null;
      const merge = (ids: number[]) => (accountIds = accountIds ? accountIds.filter((id) => ids.includes(id)) : ids);
      if (f.keyword) {
        accountIds = await fetchAccountIdsByKeyword(f.keyword);
      }
      if (f.level.length) merge(await fetchAccountIdsByCustomerFilter('level', f.level));
      if (f.region.length) merge(await fetchAccountIdsByCustomerFilter('region', f.region));
      if (f.price_type.length) merge(await fetchAccountIdsByPriceType(f.price_type));
      if (accountIds !== null && accountIds.length === 0) {
        rows.value = [];
        return;
      }

      const prices = await fetchCurrentPrices(accountIds, f.product_ids || []);
      if (!prices.length) {
        rows.value = [];
        return;
      }

      const accIds = [...new Set(prices.map((r: Record<string, unknown>) => r.account_id as number).filter(Boolean))];
      const prodIds = [...new Set(prices.map((r: Record<string, unknown>) => r.product_id as number).filter(Boolean))];
      const related = await fetchPriceRelatedData(accIds, prodIds);

      const key = (x: unknown) => (x == null ? '' : String(x));
      const accountMap: Record<string, CustomerAccount> = {};
      (related.accounts as CustomerAccount[]).forEach((a) => {
        accountMap[key(a.id)] = a;
        if (a.account_id != null) accountMap[key(a.account_id)] = a;
      });
      const customerMap = Object.fromEntries((related.customers as CustomerBasic[]).map((c) => [key(c.id), c]));
      const productMap = Object.fromEntries((related.products as ProductBasic[]).map((p) => [key(p.id), p]));

      rows.value = prices.map((r: Record<string, unknown>) => {
        const acc = accountMap[key(r.account_id)] || ({} as Partial<CustomerAccount>);
        const cust = customerMap[key((acc as CustomerAccount).customer_id)] || ({} as Partial<CustomerBasic>);
        const prod = productMap[key(r.product_id)] || ({} as Partial<ProductBasic>);
        return {
          ...r,
          customer_id: (cust as CustomerBasic).id ?? (acc as CustomerAccount).customer_id,
          company: (cust as CustomerBasic).name || '',
          account_name: (acc as CustomerAccount).account_name || '',
          level: (cust as CustomerBasic).level || '',
          region: (cust as CustomerBasic).region || '',
          price_type: (acc as CustomerAccount).price_type || '',
          product_name: (prod as ProductBasic).name || '',
          product_spec: (prod as ProductBasic).spec || '',
        };
      });
      cacheStats.value.lastUpdate = Date.now();
      cacheStats.value.cacheSize = JSON.stringify(rows.value).length;
    } catch (e: unknown) {
      ElMessage.error((e as Error)?.message || '查询失败');
      rows.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function getHistory(accountId: number, productId: number): Promise<PriceHistoryItem[]> {
    const { data, error } = await fetchPriceHistory(accountId, productId);
    if (error) throw error;
    return (data || []) as PriceHistoryItem[];
  }

  return {
    rows,
    wideRows,
    productColumns,
    loading,
    customers,
    products,
    accountsByCustomer,
    levelOptions,
    regionOptions,
    priceTypeOptions,
    cacheStats,
    invalidateOptionsCache,
    loadOptions,
    fetchData,
    getHistory,
  };
}
