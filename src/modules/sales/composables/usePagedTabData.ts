import { ref, shallowRef } from 'vue';
import type { PageResult } from '../types';

export interface PagedTabFilters {
  keyword: string;
  dateRange: [string, string] | null;
}

export function usePagedTabData<T>(
  queryFn: (params: {
    page: number;
    pageSize: number;
    dateFrom?: string | null;
    dateTo?: string | null;
    keyword?: string;
    columnFilters?: Record<string, string[]>;
  }) => Promise<PageResult<T>>
) {
  const rows = shallowRef<T[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const pageSize = ref(200);
  const filters = ref<PagedTabFilters>({ keyword: '', dateRange: null });
  const columnFilters = ref<Record<string, string[]>>({});
  const loaded = ref(false);

  let reqId = 0;

  async function fetch() {
    const currentReqId = ++reqId;
    loading.value = true;
    try {
      const res = await queryFn({
        page: page.value,
        pageSize: pageSize.value,
        dateFrom: filters.value.dateRange?.[0] || null,
        dateTo: filters.value.dateRange?.[1] || null,
        keyword: filters.value.keyword || undefined,
        columnFilters: Object.keys(columnFilters.value).length
          ? { ...columnFilters.value }
          : undefined,
      });
      if (currentReqId !== reqId) return;
      rows.value = res.rows;
      total.value = res.total;
      loaded.value = true;
    } catch (e) {
      if (currentReqId !== reqId) return;
      rows.value = [];
      total.value = 0;
      throw e;
    } finally {
      if (currentReqId === reqId) {
        loading.value = false;
      }
    }
  }

  function resetFilters() {
    filters.value = { keyword: '', dateRange: null };
    columnFilters.value = {};
    page.value = 1;
  }

  function onFilterChange(newFilters: Record<string, string[]>) {
    columnFilters.value = { ...newFilters };
    page.value = 1;
  }

  function onPageSizeChange() {
    page.value = 1;
  }

  return {
    rows,
    total,
    loading,
    page,
    pageSize,
    filters,
    columnFilters,
    loaded,
    fetch,
    resetFilters,
    onFilterChange,
    onPageSizeChange,
  };
}
