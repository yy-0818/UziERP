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
