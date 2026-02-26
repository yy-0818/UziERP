import { ref, computed } from 'vue';
import type { CnEmployeeWithStatus } from '../types';

export type ArchiveStatusFilter = '' | 'active' | 'resigned' | 'pending' | 'onLeave';

export function useArchiveFilters(list: { value: CnEmployeeWithStatus[] }) {
  const keyword = ref('');
  const statusFilter = ref<ArchiveStatusFilter>('');
  const tableFilters = ref<Record<string, string[]>>({});
  const tableSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: '', order: null });

  const filteredList = computed(() => {
    let rows = list.value;
    const k = keyword.value.trim().toLowerCase();
    if (k) {
      rows = rows.filter(
        (e) =>
          e.employee_no?.toLowerCase().includes(k) ||
          e.name?.toLowerCase().includes(k) ||
          e.department?.toLowerCase().includes(k)
      );
    }
    if (statusFilter.value === 'active') rows = rows.filter((e) => !e.resigned_at);
    if (statusFilter.value === 'resigned') rows = rows.filter((e) => !!e.resigned_at);
    if (statusFilter.value === 'pending') rows = rows.filter((e) => !e.hire_date && !e.resigned_at);
    if (statusFilter.value === 'onLeave') rows = rows.filter((e) => !!e.hire_date && !e.resigned_at && !!e.isOnLeave);
    return rows;
  });

  function createFilterOptions(field: keyof CnEmployeeWithStatus) {
    return computed(() =>
      Array.from(
        new Set(
          filteredList.value
            .map((e) => {
              const val = e[field];
              return typeof val === 'string' ? val.trim() : typeof val === 'number' ? String(val) : '';
            })
            .filter((v) => v)
        )
      )
        .sort()
        .map((text) => ({ text, value: text }))
    );
  }

  const departmentFilters = createFilterOptions('department');
  const positionFilters = createFilterOptions('position');
  const employeeNoFilters = createFilterOptions('employee_no');

  function filterMethod(columnKey: string) {
    return (value: string, row: CnEmployeeWithStatus) => {
      if (columnKey === 'status') {
        if (value === 'resigned') return !!row.resigned_at;
        if (value === 'pending') return !row.hire_date && !row.resigned_at;
        if (value === 'onLeave') return !!row.hire_date && !row.resigned_at && !!row.isOnLeave;
        if (value === 'active') return !!row.hire_date && !row.resigned_at && !row.isOnLeave;
      }
      if (columnKey === 'department') return (row.department || '') === value;
      if (columnKey === 'position') return (row.position || '') === value;
      return true;
    };
  }

  function onFilterChange(filters: Record<string, string[]>) {
    tableFilters.value = { ...filters };
  }

  function onSortChange({ prop, order }: { prop: string; order: string | null }) {
    tableSort.value = { prop: prop || '', order: order as 'ascending' | 'descending' | null };
  }

  const displayList = computed(() => {
    let rows = filteredList.value;
    Object.entries(tableFilters.value).forEach(([key, values]) => {
      if (!values?.length) return;
      if (key === 'status') {
        rows = rows.filter((r) => {
          const status = r.resigned_at ? 'resigned' : !r.hire_date ? 'pending' : r.isOnLeave ? 'onLeave' : 'active';
          return values.includes(status);
        });
      } else if (key === 'department') {
        rows = rows.filter((r) => values.includes(r.department || ''));
      } else if (key === 'position') {
        rows = rows.filter((r) => values.includes(r.position || ''));
      }
    });
    const { prop, order } = tableSort.value;
    if (prop && order) {
      rows = [...rows].sort((a, b) => {
        const av = prop === 'hire_date' ? (a.hire_date || '') : ((a as unknown as Record<string, unknown>)[prop] as string) || '';
        const bv = prop === 'hire_date' ? (b.hire_date || '') : ((b as unknown as Record<string, unknown>)[prop] as string) || '';
        const cmp = String(av).localeCompare(String(bv), 'zh-CN');
        return order === 'ascending' ? cmp : -cmp;
      });
    }
    return rows;
  });

  return {
    keyword,
    statusFilter,
    tableFilters,
    tableSort,
    filteredList,
    displayList,
    departmentFilters,
    positionFilters,
    employeeNoFilters,
    filterMethod,
    onFilterChange,
    onSortChange,
  };
}
