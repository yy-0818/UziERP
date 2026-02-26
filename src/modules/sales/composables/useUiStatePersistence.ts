import { ref, watch, onMounted, onUnmounted } from 'vue';

const PERSIST_DEBOUNCE_MS = 450;

export function useUiStatePersistence<T extends Record<string, unknown>>(
  stateKey: string,
  getState: () => T,
  restoreState: (saved: Partial<T>) => void,
  watchTargets: Parameters<typeof watch>[0]
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function persist() {
    try {
      localStorage.setItem(stateKey, JSON.stringify(getState()));
    } catch {
      /* QuotaExceededError or private browsing - silently ignore */
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(stateKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<T>;
      restoreState(saved);
    } catch {
      /* corrupted data - silently ignore */
    }
  }

  function debouncedPersist() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      persist();
    }, PERSIST_DEBOUNCE_MS);
  }

  watch(watchTargets, debouncedPersist, { deep: true });

  onMounted(restore);

  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });

  return { persist, restore };
}
