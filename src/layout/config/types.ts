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
}

/** 菜单分组（有 children） */
export interface MenuItemGroup {
  type: 'group';
  index: string;
  title: string;
  icon?: string;
  /** 分组本身可见性；不传则按子项权限聚合 */
  requiresRole?: string[];
  children: MenuItemLeaf[];
}

export type MenuNode = MenuItemLeaf | MenuItemGroup;

export function isMenuGroup(node: MenuNode): node is MenuItemGroup {
  return node.type === 'group';
}
