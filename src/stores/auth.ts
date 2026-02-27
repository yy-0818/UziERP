import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getLocalNow } from '../utils/datetime';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  /** 主角色编码（第一个角色，用于菜单/路由兼容） */
  const role = ref<string | null>(null);
  /** 用户拥有的所有角色编码列表（支持多角色组合） */
  const roles = ref<string[]>([]);
  const initialized = ref(false);
  const authReady = ref(false);

  let refreshTask: Promise<void> | null = null;

  const isLoggedIn = computed(() => !!user.value);
  const email = computed(() => (user.value?.email as string) ?? '');

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user ?? null;

    if (user.value) {
      const now = getLocalNow();
      const [{ data: roleRows }, { data: tempRows }] = await Promise.all([
        supabase.from('user_roles').select('role_id, roles:role_id(code)').eq('user_id', user.value.id),
        supabase.from('temp_role_grants').select('role_id, roles:role_id(code), effective_to')
          .eq('user_id', user.value.id).gte('effective_to', now),
      ]);

      const codes = (roleRows || [])
        .map((r: any) => r.roles?.code as string | undefined)
        .filter((c): c is string => !!c);

      const tempCodes = (tempRows || [])
        .map((r: any) => r.roles?.code as string | undefined)
        .filter((c): c is string => !!c);

      const allCodes = [...new Set([...codes, ...tempCodes])];
      roles.value = allCodes;
      role.value = allCodes[0] ?? null;
    } else {
      role.value = null;
      roles.value = [];
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
      roles.value = [];
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
    roles.value = [];
    initialized.value = true;
    authReady.value = true;
  }

  return {
    user,
    role,
    roles,
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
