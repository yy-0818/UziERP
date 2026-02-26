import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { usePagedTabData } from '../usePagedTabData';

function createMockQuery(rows: unknown[] = [], total = 0) {
  return vi.fn().mockResolvedValue({ rows, total });
}

describe('usePagedTabData', () => {
  it('should initialize with default state', () => {
    const tab = usePagedTabData(createMockQuery());
    expect(tab.rows.value).toEqual([]);
    expect(tab.total.value).toBe(0);
    expect(tab.loading.value).toBe(false);
    expect(tab.page.value).toBe(1);
    expect(tab.pageSize.value).toBe(200);
    expect(tab.loaded.value).toBe(false);
  });

  it('should fetch data and update state', async () => {
    const mockRows = [{ id: '1' }, { id: '2' }];
    const queryFn = createMockQuery(mockRows, 42);
    const tab = usePagedTabData(queryFn);

    await tab.fetch();

    expect(tab.rows.value).toEqual(mockRows);
    expect(tab.total.value).toBe(42);
    expect(tab.loaded.value).toBe(true);
    expect(tab.loading.value).toBe(false);
  });

  it('should pass correct params to queryFn', async () => {
    const queryFn = createMockQuery();
    const tab = usePagedTabData(queryFn);

    tab.filters.value = { keyword: 'test', dateRange: ['2026-01-01', '2026-01-31'] };
    tab.page.value = 2;
    tab.pageSize.value = 500;
    tab.columnFilters.value = { status: ['active'] };

    await tab.fetch();

    expect(queryFn).toHaveBeenCalledWith({
      page: 2,
      pageSize: 500,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      keyword: 'test',
      columnFilters: { status: ['active'] },
    });
  });

  it('should not pass columnFilters when empty', async () => {
    const queryFn = createMockQuery();
    const tab = usePagedTabData(queryFn);

    await tab.fetch();

    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({ columnFilters: undefined })
    );
  });

  it('should handle race conditions - stale request discarded', async () => {
    let resolveFirst: (v: { rows: unknown[]; total: number }) => void;
    const firstPromise = new Promise<{ rows: unknown[]; total: number }>((r) => { resolveFirst = r; });
    let callCount = 0;
    const queryFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return firstPromise;
      return Promise.resolve({ rows: [{ id: 'second' }], total: 1 });
    });

    const tab = usePagedTabData(queryFn);

    const p1 = tab.fetch();
    const p2 = tab.fetch();

    resolveFirst!({ rows: [{ id: 'first' }], total: 10 });

    await Promise.all([p1, p2]);

    expect(tab.rows.value).toEqual([{ id: 'second' }]);
    expect(tab.total.value).toBe(1);
  });

  it('should reset filters and page', () => {
    const tab = usePagedTabData(createMockQuery());
    tab.filters.value = { keyword: 'test', dateRange: ['2026-01-01', '2026-12-31'] };
    tab.columnFilters.value = { foo: ['bar'] };
    tab.page.value = 5;

    tab.resetFilters();

    expect(tab.filters.value).toEqual({ keyword: '', dateRange: null });
    expect(tab.columnFilters.value).toEqual({});
    expect(tab.page.value).toBe(1);
  });

  it('should reset page on filter change', () => {
    const tab = usePagedTabData(createMockQuery());
    tab.page.value = 3;

    tab.onFilterChange({ status: ['done'] });

    expect(tab.page.value).toBe(1);
    expect(tab.columnFilters.value).toEqual({ status: ['done'] });
  });

  it('should reset page on page size change', () => {
    const tab = usePagedTabData(createMockQuery());
    tab.page.value = 5;

    tab.onPageSizeChange();

    expect(tab.page.value).toBe(1);
  });

  it('should handle fetch error and reset state', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const tab = usePagedTabData(queryFn);

    await expect(tab.fetch()).rejects.toThrow('Network error');

    expect(tab.rows.value).toEqual([]);
    expect(tab.total.value).toBe(0);
    expect(tab.loading.value).toBe(false);
  });
});
