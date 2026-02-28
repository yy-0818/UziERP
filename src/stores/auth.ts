import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getLocalNow } from '../utils/datetime';
import { getPermissionsByRoles } from '../permissions/roleMap';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  /** @deprecated 仅兼容过渡期，请使用 roles + permissions */
  const role = ref<string | null>(null);
  /** 用户拥有的所有角色编码列表（支持多角色组合） */
  const roles = ref<string[]>([]);
  /** 当前用户权限点集合（由角色聚合或 RPC 返回，为权限校验唯一数据源） */
  const permissions = ref<string[]>([]);
  /** 权限版本，刷新后递增，便于缓存失效 */
  const permissionVersion = ref(0);
  const initialized = ref(false);
  const authReady = ref(false);
  /** 当前用户在 user_roles 表中的 name、email（用于展示与操作人标识） */
  const userRoleProfile = ref<{ name: string; email: string }>({ name: '', email: '' });

  let refreshTask: Promise<void> | null = null;

  const isLoggedIn = computed(() => !!user.value);
  const email = computed(() => (user.value?.email as string) ?? '');
  /** 当前账户展示/操作人标识：优先 user_role.name，为空则 user_role.email，再空则 Supabase user.email */
  const accountDisplay = computed(() => {
    const name = (userRoleProfile.value?.name ?? '').trim();
    if (name) return name;
    const roleEmail = userRoleProfile.value?.email ?? '';
    if (roleEmail) return roleEmail;
    return (user.value?.email as string) ?? '';
  });

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user ?? null;

    if (user.value) {
      const uid = user.value.id;
      const now = getLocalNow();

      // 优先使用 RPC 聚合（若后端已提供 get_user_roles_and_permissions），否则前端聚合
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_roles_and_permissions', { p_user_id: uid });
      const useRpc = !rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0;
      if (useRpc) {
        const row = (rpcData as { roles?: string[]; permissions?: string[]; temp_effective?: boolean }[])[0];
        const rpcRoles = row?.roles ?? [];
        const rpcPerms = row?.permissions ?? [];
        roles.value = Array.isArray(rpcRoles) ? rpcRoles : [];
        permissions.value = Array.isArray(rpcPerms) ? rpcPerms : [];
        role.value = roles.value[0] ?? null;
      } else {
        const [{ data: roleRows }, { data: tempRows }] = await Promise.all([
          supabase.from('user_roles').select('role_id, roles:role_id(code), name, email').eq('user_id', uid),
          supabase.from('temp_role_grants').select('role_id, roles:role_id(code), effective_to')
            .eq('user_id', uid).gte('effective_to', now),
        ]);

        type RoleRow = { roles?: { code?: string } | { code?: string }[]; name?: string; email?: string };
        const toCode = (r: RoleRow): string | undefined => {
          const roles = r.roles;
          if (!roles) return undefined;
          const one = Array.isArray(roles) ? roles[0] : roles;
          return one?.code;
        };
        const codes = (roleRows || []).map((r: RoleRow) => toCode(r)).filter((c): c is string => !!c);

        type TempRow = RoleRow & { effective_to?: string };
        const tempCodes = (tempRows || []).map((r: TempRow) => toCode(r)).filter((c): c is string => !!c);

        const allCodes = [...new Set([...codes, ...tempCodes])];
        roles.value = allCodes;
        role.value = allCodes[0] ?? null;
        permissions.value = Array.from(getPermissionsByRoles(allCodes));

        const firstRoleRow = (roleRows || [])[0] as RoleRow | undefined;
        userRoleProfile.value = {
          name: firstRoleRow?.name ?? '',
          email: firstRoleRow?.email ?? '',
        };
      }

      if (useRpc) {
        const { data: urRow } = await supabase.from('user_roles').select('name, email').eq('user_id', uid).maybeSingle();
        const ur = urRow as { name?: string; email?: string } | null;
        userRoleProfile.value = { name: ur?.name ?? '', email: ur?.email ?? '' };
      }

      permissionVersion.value += 1;
    } else {
      role.value = null;
      roles.value = [];
      permissions.value = [];
      userRoleProfile.value = { name: '', email: '' };
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
      permissions.value = [];
      userRoleProfile.value = { name: '', email: '' };
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
    permissions.value = [];
    userRoleProfile.value = { name: '', email: '' };
    initialized.value = true;
    authReady.value = true;
  }

  return {
    user,
    role,
    roles,
    permissions,
    permissionVersion,
    email,
    accountDisplay,
    userRoleProfile,
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
