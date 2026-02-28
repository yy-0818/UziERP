/**
 * ERP 侧栏菜单配置 - 按权限点过滤，requiresPermissions 优先
 */
import type { MenuNode } from './types';
import { getPermissionsByRoles } from '../../permissions';

/** 原始菜单树（与路由对应，新增模块在此追加） */
export const rawMenuTree: MenuNode[] = [
  {
    type: 'item',
    index: '/dashboard',
    title: '总览首页',
    icon: 'Odometer',
  },
  {
    type: 'group',
    index: 'master',
    title: '主数据',
    icon: 'FolderOpened',
    children: [
      { type: 'item', index: '/master/customers', title: '客户管理' },
      { type: 'item', index: '/master/products', title: '产品管理' },
    ],
  },
  {
    type: 'group',
    index: 'business',
    title: '业务管理',
    icon: 'Document',
    children: [
      { type: 'item', index: '/business/pricing', title: '价格查询与维护' },
      { type: 'item', index: '/contracts', title: '合同管理' },
      { type: 'item', index: '/sales', title: '销售数据' },
    ],
  },
  {
    type: 'group',
    index: 'hr',
    title: '员工管理',
    icon: 'User',
    children: [
      { type: 'item', index: '/hr/employees-uz', title: '乌兹员工' },
      {
        type: 'group',
        index: 'hr-employees-cn',
        title: '中国员工',
        requiresPermissions: ['hr.employee_cn.read'],
        children: [
          { type: 'item', index: '/hr/employees-cn/archives', title: '档案管理' },
          { type: 'item', index: '/hr/employees-cn/process', title: '流程中心' },
          { type: 'item', index: '/hr/employees-cn/attendance', title: '考勤与人事' },
          { type: 'item', index: '/hr/employees-cn/todos', title: '待办中心' },
          { type: 'item', index: '/hr/employees-cn/operation-log', title: '中方员工日志', requiresPermissions: ['admin.auditlog.read'] },
        ],
      },
    ],
  },
  {
    type: 'group',
    index: 'admin',
    title: '系统管理',
    icon: 'Tools',
    requiresPermissions: ['admin.user.manage'],
    children: [
      { type: 'item', index: '/admin/users', title: '用户与角色' },
    ],
  },
];

function hasAnyPermission(userPerms: Set<string>, required: string[] | undefined): boolean {
  if (!required || required.length === 0) return true;
  return required.some((p) => userPerms.has(p));
}

function checkNodeAccess(node: MenuNode, userPerms: Set<string>, userRoles: string[]): boolean {
  const perms = node.requiresPermissions ?? (node.requiresPermission != null ? (Array.isArray(node.requiresPermission) ? node.requiresPermission : [node.requiresPermission]) : undefined);
  if (perms && perms.length > 0) return hasAnyPermission(userPerms, perms);
  if (node.requiresRole && node.requiresRole.length > 0) return node.requiresRole.some((r) => userRoles.includes(r));
  return true;
}

/** 按权限点过滤菜单；传入当前用户 permissions 与 roles（过渡期兼容 requiresRole） */
export function filterMenuByPermission(menuTree: MenuNode[], permissions: string[], roles: string[] = []): MenuNode[] {
  const permSet = new Set(permissions);
  const result: MenuNode[] = [];
  for (const node of menuTree) {
    if (node.type === 'item') {
      if (checkNodeAccess(node, permSet, roles)) result.push(node);
      continue;
    }
    const filteredChildren = filterMenuByPermission(node.children, permissions, roles);
    const groupVisible = checkNodeAccess(node, permSet, roles) && filteredChildren.length > 0;
    if (groupVisible) result.push({ ...node, children: filteredChildren });
  }
  return result;
}

/** @deprecated 过渡期保留，请使用 filterMenuByPermission(menuTree, auth.permissions, auth.roles) */
export function filterMenuByRole(menuTree: MenuNode[], userRole: string | null): MenuNode[] {
  const perms = Array.from(getPermissionsByRoles(userRole ? [userRole] : []));
  return filterMenuByPermission(menuTree, perms, userRole ? [userRole] : []);
}
