import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'uzi.layout.sidebar-collapsed';

function persistCollapsed(value: boolean) {
  if (typeof localStorage === 'undefined') return;
  const doWrite = () => localStorage.setItem(STORAGE_KEY, String(value));
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(doWrite, { timeout: 300 });
  } else {
    setTimeout(doWrite, 0);
  }
}

export const useLayoutStore = defineStore('layout', () => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const sidebarCollapsed = ref(raw === 'true');

  watch(sidebarCollapsed, (v) => persistCollapsed(v), { flush: 'post' });

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  return {
    sidebarCollapsed,
    toggleSidebar,
  };
});
