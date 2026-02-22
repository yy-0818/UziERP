import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalIsoString } from './datetime';

describe('getLocalIsoString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns local datetime string in YYYY-MM-DDTHH:mm:ss format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 2, 3, 4, 5));

    expect(getLocalIsoString()).toBe('2025-01-02T03:04:05');
  });
});
