/**
 * 统一权限服务 composable
 * 支持多角色组合——用户可同时拥有多个角色，权限取并集
 */
import { computed, type ComputedRef } from 'vue';
import { useAuthStore } from '../stores/auth';
import { type PermissionCode } from './constants';
import { getPermissionsByRole } from './roleMap';

export function usePermission() {
  const auth = useAuthStore();

  const permissions = computed(() => {
    const allPerms = new Set<PermissionCode>();
    for (const roleCode of auth.roles) {
      for (const p of getPermissionsByRole(roleCode)) {
        allPerms.add(p);
      }
    }
    if (!allPerms.size && auth.role) {
      for (const p of getPermissionsByRole(auth.role)) {
        allPerms.add(p);
      }
    }
    return allPerms;
  });

  function can(permission: PermissionCode): ComputedRef<boolean> {
    return computed(() => permissions.value.has(permission));
  }

  function canAny(...perms: PermissionCode[]): ComputedRef<boolean> {
    return computed(() => perms.some((p) => permissions.value.has(p)));
  }

  function canAll(...perms: PermissionCode[]): ComputedRef<boolean> {
    return computed(() => perms.every((p) => permissions.value.has(p)));
  }

  return { permissions, can, canAny, canAll };
}
