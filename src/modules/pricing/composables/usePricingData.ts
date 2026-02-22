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

const OPTIONS_CACHE_KEY = 'price_options_cache';
const OPTIONS_CACHE_TTL = 5 * 60 * 1000;

export function usePricingData(filters: { value: PriceFilters }) {
  const rows = ref<any[]>([]);
  const loading = ref(false);
  const customers = ref<any[]>([]);
  const products = ref<any[]>([]);
  const accountsByCustomer = ref<Record<string, any[]>>({});
  const levelOptions = ref<string[]>([]);
  const regionOptions = ref<string[]>([]);
  const priceTypeOptions = ref<string[]>([]);
  const cacheStats = ref({ lastUpdate: 0, hitCount: 0, missCount: 0, cacheSize: 0 });

  const wideRows = computed(() => {
    const byKey = new Map<string, any>();
    for (const r of rows.value) {
      const key = `${r.account_id}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          company: r.company || '',
          account_name: r.account_name || '',
          level: r.level || '',
          region: r.region || '',
          price_type: r.price_type || '',
          account_id: r.account_id,
          customer_id: r.customer_id ?? null,
          _cells: {},
        });
      }
      const row = byKey.get(key);
      const spec = r.product_spec || r.product_name || String(r.product_id);
      row._cells[spec] = { price: r.price, product_id: r.product_id };
    }
    return [...byKey.values()];
  });

  const productColumns = computed(() => {
    return [...products.value]
      .map((p: any) => p.spec || p.name || String(p.id))
      .filter(Boolean)
      .sort();
  });

  const assignOptions = (data: any) => {
    customers.value = data.customers || [];
    products.value = data.products || [];
    accountsByCustomer.value = data.accountsByCustomer || {};
    levelOptions.value = data.levelOptions || [];
    regionOptions.value = data.regionOptions || [];
    priceTypeOptions.value = data.priceTypeOptions || [];
  };

  const invalidateOptionsCache = () => localStorage.removeItem(OPTIONS_CACHE_KEY);

  async function loadOptions(force = false) {
    const now = Date.now();
    if (!force) {
      try {
        const cached = localStorage.getItem(OPTIONS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (now - parsed.ts < OPTIONS_CACHE_TTL) {
            assignOptions(parsed);
            cacheStats.value.hitCount += 1;
            return;
          }
        }
      } catch {
        // noop
      }
    }

    const [{ data: cs }, { data: ps }, { data: accounts }] = await Promise.all([
      fetchCustomersBasic(),
      fetchProductsBasic(),
      fetchAccountsBasic(),
    ]);
    const customersData = cs || [];
    const productsData = ps || [];
    const accData = accounts || [];

    const byCustomer: Record<string, any[]> = {};
    accData.forEach((a: any) => {
      const key = String(a.customer_id || '');
      if (!key) return;
      if (!byCustomer[key]) byCustomer[key] = [];
      byCustomer[key].push(a);
    });

    const payload = {
      customers: customersData,
      products: productsData,
      accountsByCustomer: byCustomer,
      levelOptions: [...new Set(customersData.map((c: any) => c.level).filter(Boolean))].sort(),
      regionOptions: [...new Set(customersData.map((c: any) => c.region).filter(Boolean))].sort(),
      priceTypeOptions: [...new Set(accData.map((a: any) => a.price_type).filter(Boolean))].sort(),
      ts: now,
    };
    assignOptions(payload);
    cacheStats.value.missCount += 1;
    localStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify(payload));
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

      const accIds = [...new Set(prices.map((r: any) => r.account_id).filter(Boolean))];
      const prodIds = [...new Set(prices.map((r: any) => r.product_id).filter(Boolean))];
      const related = await fetchPriceRelatedData(accIds, prodIds);

      const key = (x: any) => (x == null ? '' : String(x));
      const accountMap: Record<string, any> = {};
      related.accounts.forEach((a: any) => {
        accountMap[key(a.id)] = a;
        if (a.account_id != null) accountMap[key(a.account_id)] = a;
      });
      const customerMap = Object.fromEntries(related.customers.map((c: any) => [key(c.id), c]));
      const productMap = Object.fromEntries(related.products.map((p: any) => [key(p.id), p]));

      rows.value = prices.map((r: any) => {
        const acc = accountMap[key(r.account_id)] || {};
        const cust = customerMap[key(acc.customer_id)] || {};
        const prod = productMap[key(r.product_id)] || {};
        return {
          ...r,
          customer_id: cust.id ?? acc.customer_id,
          company: cust.name || '',
          account_name: acc.account_name || '',
          level: cust.level || '',
          region: cust.region || '',
          price_type: acc.price_type || '',
          product_name: prod.name || '',
          product_spec: prod.spec || '',
        };
      });
      cacheStats.value.lastUpdate = Date.now();
      cacheStats.value.cacheSize = JSON.stringify(rows.value).length;
    } catch (e: any) {
      ElMessage.error(e?.message || '查询失败');
      rows.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function getHistory(accountId: number, productId: number) {
    const { data, error } = await fetchPriceHistory(accountId, productId);
    if (error) throw error;
    return data || [];
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
