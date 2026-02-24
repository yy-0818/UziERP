import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const role = ref<string | null>(null);
  const initialized = ref(false);
  const authReady = ref(false);

  let refreshTask: Promise<void> | null = null;

  const isLoggedIn = computed(() => !!user.value);
  /** 当前用户邮箱（经办人/修改人） */
  const email = computed(() => (user.value?.email as string) ?? '');

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user ?? null;

    if (user.value) {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.value.id)
        .maybeSingle();
      role.value = roleRow?.role ?? null;
    } else {
      role.value = null;
    }
    initialized.value = true;
    authReady.value = true;
  }

  async function refreshAuthState(options: { force?: boolean } = {}) {
    if (refreshTask) return refreshTask;
    if (!options.force && initialized.value) return;

    refreshTask = loadUser().finally(() => {
      refreshTask = null;
    });
    await refreshTask;
  }

  async function ensureAuthReady() {
    if (authReady.value) return;
    await refreshAuthState();
  }

  const {
    data: { subscription: authSubscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      user.value = null;
      role.value = null;
      initialized.value = true;
      authReady.value = true;
      return;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      void refreshAuthState({ force: true });
    }
  });

  onScopeDispose(() => {
    authSubscription.unsubscribe();
  });

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshAuthState({ force: true });
  }

  async function logout() {
    await supabase.auth.signOut();
    user.value = null;
    role.value = null;
    initialized.value = true;
    authReady.value = true;
  }

  return {
    user,
    role,
    email,
    initialized,
    authReady,
    isLoggedIn,
    loadUser,
    refreshAuthState,
    ensureAuthReady,
    login,
    logout,
  };
});
