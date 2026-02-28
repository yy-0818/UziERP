/**
 * 统一权限服务 composable
 * 以 auth.permissions 为唯一数据源，禁止在页面中直接使用 auth.role / hasRole
 */
import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '../stores/auth';
import { type PermissionCode } from './constants';
import { getPermissionsByRoles } from './roleMap';

export function usePermission() {
  const auth = useAuthStore();

  const permissions = computed(() => {
    if (auth.permissions.length > 0) return new Set<string>(auth.permissions);
    return getPermissionsByRoles(auth.roles);
  });

  function can(permission: PermissionCode | string): ComputedRef<boolean> {
    return computed(() => permissions.value.has(permission));
  }

  function canAny(...perms: (PermissionCode | string)[]): ComputedRef<boolean> {
    return computed(() => perms.some((p) => permissions.value.has(p)));
  }

  function canAll(...perms: (PermissionCode | string)[]): ComputedRef<boolean> {
    return computed(() => perms.every((p) => permissions.value.has(p)));
  }

  return { permissions, can, canAny, canAll };
}
