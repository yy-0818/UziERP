import { ref, computed } from 'vue';
import { fetchEmployeeTimeline } from '../api';
import type { EmployeeTimelineItem } from '../types';

const TIMELINE_DEFAULT_COUNT = 10;
const TIMELINE_DAYS = 30;

export function useArchiveTimeline() {
  const items = ref<EmployeeTimelineItem[]>([]);
  const folded = ref(true);

  const displayItems = computed(() => {
    if (!folded.value) return items.value;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TIMELINE_DAYS);
    const cutoffStr = cutoff.toISOString();
    const inRange = items.value.filter((i) => (i.date || '') >= cutoffStr);
    if (inRange.length >= TIMELINE_DEFAULT_COUNT) return inRange;
    return items.value.slice(0, TIMELINE_DEFAULT_COUNT);
  });

  const hasMore = computed(
    () => items.value.length > displayItems.value.length
  );

  async function load(employeeId: string) {
    folded.value = true;
    try {
      items.value = await fetchEmployeeTimeline(employeeId);
    } catch {
      items.value = [];
    }
  }

  function reset() {
    items.value = [];
    folded.value = true;
  }

  return {
    items,
    folded,
    displayItems,
    hasMore,
    load,
    reset,
  };
}
