/**
 * 布局与菜单类型定义 - 支撑 ERP 多模块、权限化菜单
 */

/** 菜单项（叶子节点：无 children） */
export interface MenuItemLeaf {
  type: 'item';
  index: string;
  title: string;
  icon?: string;
  /** 需要具备的角色之一才显示，不传则所有人可见 */
  requiresRole?: string[];
  /** 需要具备的权限之一才显示（优先于 requiresRole） */
  requiresPermission?: string | string[];
  /** 用于注入红点/数字的 key，如 'todoCount' */
  badgeKey?: string;
  /** 红点或数字（由布局注入） */
  badge?: number;
}

/** 菜单分组（有 children，支持嵌套：员工管理 → 中国员工 → 各项） */
export interface MenuItemGroup {
  type: 'group';
  index: string;
  title: string;
  icon?: string;
  /** 分组本身可见性；不传则按子项权限聚合 */
  requiresRole?: string[];
  /** 需要具备的权限之一才显示（优先于 requiresRole） */
  requiresPermission?: string | string[];
  children: MenuNode[];
}

export type MenuNode = MenuItemLeaf | MenuItemGroup;

export function isMenuGroup(node: MenuNode): node is MenuItemGroup {
  return node.type === 'group';
}
