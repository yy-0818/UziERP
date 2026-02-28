/**
 * 布局与菜单类型定义 - 支撑 ERP 多模块、权限化菜单
 */

/** 菜单项（叶子节点：无 children） */
export interface MenuItemLeaf {
  type: 'item';
  index: string;
  title: string;
  icon?: string;
  /** @deprecated 过渡期保留，请使用 requiresPermissions */
  requiresRole?: string[];
  /** 需要具备的权限点之一才显示（优先） */
  requiresPermissions?: string[];
  /** 单权限兼容，内部会转为 requiresPermissions */
  requiresPermission?: string | string[];
  badgeKey?: string;
  badge?: number;
}

/** 菜单分组（有 children，支持嵌套） */
export interface MenuItemGroup {
  type: 'group';
  index: string;
  title: string;
  icon?: string;
  /** @deprecated 过渡期保留，请使用 requiresPermissions */
  requiresRole?: string[];
  requiresPermissions?: string[];
  requiresPermission?: string | string[];
  children: MenuNode[];
}

export type MenuNode = MenuItemLeaf | MenuItemGroup;

export function isMenuGroup(node: MenuNode): node is MenuItemGroup {
  return node.type === 'group';
}
