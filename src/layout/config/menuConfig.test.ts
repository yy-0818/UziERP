import { describe, expect, it } from 'vitest';
import { filterMenuByRole, rawMenuTree } from './menuConfig';

describe('filterMenuByRole', () => {
  it('hides role-restricted groups for normal users', () => {
    const filtered = filterMenuByRole(rawMenuTree, 'staff');
    const indexes = filtered.map((node) => node.index);

    expect(indexes).not.toContain('admin');

    const hrGroup = filtered.find((node) => node.index === 'hr');
    expect(hrGroup?.type).toBe('group');
    if (hrGroup?.type === 'group') {
      expect(hrGroup.children.map((child) => child.index)).not.toContain('hr-employees-cn');
    }
  });

  it('keeps nested super_admin entries for super_admin role', () => {
    const filtered = filterMenuByRole(rawMenuTree, 'super_admin');

    const adminGroup = filtered.find((node) => node.index === 'admin');
    expect(adminGroup).toBeTruthy();

    const hrGroup = filtered.find((node) => node.index === 'hr');
    expect(hrGroup?.type).toBe('group');
    if (hrGroup?.type === 'group') {
      expect(hrGroup.children.map((child) => child.index)).toContain('hr-employees-cn');
    }
  });
});
