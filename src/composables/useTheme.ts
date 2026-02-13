import { computed, ref } from 'vue';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'uzi.theme';
const themeMode = ref<ThemeMode>('light');
let initialized = false;

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : null;
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
}

function persistTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function initTheme() {
  if (initialized) return;
  themeMode.value = getStoredTheme() ?? getSystemTheme();
  applyTheme(themeMode.value);
  initialized = true;
}

export function useTheme() {
  if (!initialized) initTheme();

  const isDark = computed(() => themeMode.value === 'dark');

  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode;
    applyTheme(mode);
    persistTheme(mode);
  };

  const toggleTheme = () => {
    setTheme(isDark.value ? 'light' : 'dark');
  };

  return {
    isDark,
    themeMode: computed(() => themeMode.value),
    setTheme,
    toggleTheme,
  };
}
