import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '../supabase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any | null>(null);
  const role = ref<string | null>(null);
  const initialized = ref(false);

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
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadUser();
  }

  async function logout() {
    await supabase.auth.signOut();
    user.value = null;
    role.value = null;
  }

  return {
    user,
    role,
    email,
    initialized,
    isLoggedIn,
    loadUser,
    login,
    logout,
  };
});

