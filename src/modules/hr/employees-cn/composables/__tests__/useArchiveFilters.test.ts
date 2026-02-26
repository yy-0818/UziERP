import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useArchiveFilters } from '../useArchiveFilters';
import type { CnEmployeeWithStatus } from '../../types';

function makeMockEmployee(overrides: Partial<CnEmployeeWithStatus> = {}): CnEmployeeWithStatus {
  return {
    id: '1',
    employee_no: '001',
    name: '张三',
    passport_no: null,
    passport_photo_url: null,
    birth_date: null,
    photo_url: null,
    gender: '男',
    department: '技术部',
    position: '工程师',
    hire_date: '2025-01-01',
    resigned_at: null,
    resigned_by: null,
    resign_remark: null,
    bank_account: null,
    bank_name: null,
    salary_standard: null,
    id_card_no: null,
    home_address: null,
    marital_status: null,
    contact_phone: null,
    emergency_contact: null,
    emergency_phone: null,
    created_at: '2025-01-01',
    updated_at: null,
    isOnLeave: false,
    ...overrides,
  };
}

describe('useArchiveFilters', () => {
  it('should filter by keyword (name)', () => {
    const list = ref([
      makeMockEmployee({ id: '1', name: '张三', employee_no: '001' }),
      makeMockEmployee({ id: '2', name: '李四', employee_no: '002' }),
      makeMockEmployee({ id: '3', name: '王五', employee_no: '003' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.keyword.value = '李';
    expect(filters.displayList.value).toHaveLength(1);
    expect(filters.displayList.value[0].name).toBe('李四');
  });

  it('should filter by keyword (employee_no)', () => {
    const list = ref([
      makeMockEmployee({ id: '1', name: '张三', employee_no: '001' }),
      makeMockEmployee({ id: '2', name: '李四', employee_no: '002' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.keyword.value = '002';
    expect(filters.displayList.value).toHaveLength(1);
    expect(filters.displayList.value[0].employee_no).toBe('002');
  });

  it('should filter by keyword (department)', () => {
    const list = ref([
      makeMockEmployee({ id: '1', department: '技术部' }),
      makeMockEmployee({ id: '2', department: '销售部' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.keyword.value = '销售';
    expect(filters.displayList.value).toHaveLength(1);
    expect(filters.displayList.value[0].department).toBe('销售部');
  });

  it('should filter active employees', () => {
    const list = ref([
      makeMockEmployee({ id: '1', hire_date: '2025-01-01', resigned_at: null }),
      makeMockEmployee({ id: '2', hire_date: '2025-01-01', resigned_at: '2025-06-01' }),
      makeMockEmployee({ id: '3', hire_date: null, resigned_at: null }),
    ]);
    const filters = useArchiveFilters(list);

    filters.statusFilter.value = 'active';
    expect(filters.filteredList.value).toHaveLength(2);
  });

  it('should filter resigned employees', () => {
    const list = ref([
      makeMockEmployee({ id: '1', resigned_at: null }),
      makeMockEmployee({ id: '2', resigned_at: '2025-06-01' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.statusFilter.value = 'resigned';
    expect(filters.filteredList.value).toHaveLength(1);
    expect(filters.filteredList.value[0].id).toBe('2');
  });

  it('should filter pending (no hire_date) employees', () => {
    const list = ref([
      makeMockEmployee({ id: '1', hire_date: '2025-01-01' }),
      makeMockEmployee({ id: '2', hire_date: null, resigned_at: null }),
    ]);
    const filters = useArchiveFilters(list);

    filters.statusFilter.value = 'pending';
    expect(filters.filteredList.value).toHaveLength(1);
    expect(filters.filteredList.value[0].id).toBe('2');
  });

  it('should filter on-leave employees', () => {
    const list = ref([
      makeMockEmployee({ id: '1', hire_date: '2025-01-01', isOnLeave: true }),
      makeMockEmployee({ id: '2', hire_date: '2025-01-01', isOnLeave: false }),
    ]);
    const filters = useArchiveFilters(list);

    filters.statusFilter.value = 'onLeave';
    expect(filters.filteredList.value).toHaveLength(1);
    expect(filters.filteredList.value[0].id).toBe('1');
  });

  it('should generate department filter options', () => {
    const list = ref([
      makeMockEmployee({ id: '1', department: '技术部' }),
      makeMockEmployee({ id: '2', department: '销售部' }),
      makeMockEmployee({ id: '3', department: '技术部' }),
    ]);
    const filters = useArchiveFilters(list);

    const opts = filters.departmentFilters.value;
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.value)).toContain('技术部');
    expect(opts.map((o) => o.value)).toContain('销售部');
  });

  it('should sort by hire_date ascending', () => {
    const list = ref([
      makeMockEmployee({ id: '1', hire_date: '2025-06-01' }),
      makeMockEmployee({ id: '2', hire_date: '2025-01-01' }),
      makeMockEmployee({ id: '3', hire_date: '2025-12-01' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.onSortChange({ prop: 'hire_date', order: 'ascending' });
    const sorted = filters.displayList.value;
    expect(sorted[0].hire_date).toBe('2025-01-01');
    expect(sorted[2].hire_date).toBe('2025-12-01');
  });

  it('should apply column filters', () => {
    const list = ref([
      makeMockEmployee({ id: '1', department: '技术部' }),
      makeMockEmployee({ id: '2', department: '销售部' }),
    ]);
    const filters = useArchiveFilters(list);

    filters.onFilterChange({ department: ['销售部'] });
    expect(filters.displayList.value).toHaveLength(1);
    expect(filters.displayList.value[0].department).toBe('销售部');
  });
});
