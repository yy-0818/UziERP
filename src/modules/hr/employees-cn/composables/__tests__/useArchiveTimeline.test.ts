import { describe, it, expect, vi } from 'vitest';
import { useArchiveTimeline } from '../useArchiveTimeline';

vi.mock('../../api', () => ({
  fetchEmployeeTimeline: vi.fn(),
}));

import { fetchEmployeeTimeline } from '../../api';

const mockedFetch = vi.mocked(fetchEmployeeTimeline);

describe('useArchiveTimeline', () => {
  it('should initialize with empty state', () => {
    const tl = useArchiveTimeline();
    expect(tl.items.value).toEqual([]);
    expect(tl.folded.value).toBe(true);
    expect(tl.displayItems.value).toEqual([]);
    expect(tl.hasMore.value).toBe(false);
  });

  it('should load timeline items', async () => {
    const mockItems = [
      { id: '1', type: 'visa', title: '签证申请', date: new Date().toISOString(), status: '待办理' },
      { id: '2', type: 'flight', title: '机票申请', date: new Date().toISOString(), status: '已办理' },
    ];
    mockedFetch.mockResolvedValue(mockItems);

    const tl = useArchiveTimeline();
    await tl.load('emp-123');

    expect(mockedFetch).toHaveBeenCalledWith('emp-123');
    expect(tl.items.value).toEqual(mockItems);
    expect(tl.folded.value).toBe(true);
  });

  it('should display limited items when folded with old dates', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      type: 'visa',
      title: `Item ${i}`,
      date: new Date(Date.now() - i * 60 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    mockedFetch.mockResolvedValue(items);

    const tl = useArchiveTimeline();
    await tl.load('emp-123');

    expect(tl.folded.value).toBe(true);
    expect(tl.displayItems.value.length).toBe(10);
    expect(tl.hasMore.value).toBe(true);
  });

  it('should show all items when unfolded', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      type: 'visa',
      title: `Item ${i}`,
      date: new Date(Date.now() - i * 60 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    mockedFetch.mockResolvedValue(items);

    const tl = useArchiveTimeline();
    await tl.load('emp-123');
    tl.folded.value = false;

    expect(tl.displayItems.value).toHaveLength(20);
  });

  it('should reset state', async () => {
    mockedFetch.mockResolvedValue([{ id: '1', type: 'visa', title: 'test', date: '2025-01-01' }]);

    const tl = useArchiveTimeline();
    await tl.load('emp-123');
    expect(tl.items.value).toHaveLength(1);

    tl.reset();
    expect(tl.items.value).toEqual([]);
    expect(tl.folded.value).toBe(true);
  });

  it('should handle fetch errors gracefully', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'));

    const tl = useArchiveTimeline();
    await tl.load('emp-123');

    expect(tl.items.value).toEqual([]);
  });
});
