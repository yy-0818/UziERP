/**
 * @deprecated 请使用 src/permissions/usePermission.ts 的 can() 方法替代
 * 此文件保留用于渐进迁移兼容，新代码请勿使用
 */

export type UserRole = string | null | undefined;

export function normalizeRole(role: UserRole): string {
  return role ?? '';
}

export function hasRole(role: UserRole, expectedRole: string): boolean {
  return normalizeRole(role) === expectedRole;
}

export function hasAnyRole(role: UserRole, roles: readonly string[]): boolean {
  const currentRole = normalizeRole(role);
  return roles.includes(currentRole);
}
