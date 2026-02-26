/**
 * ERP 侧栏菜单配置 - 集中维护、按权限过滤，便于扩展新模块
 */
import type { MenuNode } from './types';
import { getPermissionsByRole, type PermissionCode } from '../../permissions';

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
        requiresPermission: 'hr.employee_cn.read',
        children: [
          { type: 'item', index: '/hr/employees-cn/archives', title: '档案管理' },
          { type: 'item', index: '/hr/employees-cn/process', title: '流程中心' },
          { type: 'item', index: '/hr/employees-cn/attendance', title: '考勤与人事' },
          { type: 'item', index: '/hr/employees-cn/todos', title: '待办中心' },
          // { type: 'item', index: '/hr/employees-cn/todos', title: '待办中心', badgeKey: 'todoCount' },
        ],
      },
    ],
  },
  {
    type: 'group',
    index: 'admin',
    title: '系统管理',
    icon: 'Tools',
    requiresPermission: 'admin.user.manage',
    children: [
      { type: 'item', index: '/admin/users', title: '用户与角色' },
      { type: 'item', index: '/admin/operation-log', title: '操作日志' },
    ],
  },
];

function checkAccess(
  requiresRole: string[] | undefined,
  requiresPermission: string | string[] | undefined,
  userRole: string | null
): boolean {
  if (requiresPermission) {
    const perms = getPermissionsByRole(userRole);
    const permArr = Array.isArray(requiresPermission) ? requiresPermission : [requiresPermission];
    return permArr.some((p) => perms.has(p as PermissionCode));
  }
  if (requiresRole && requiresRole.length > 0) {
    if (!userRole) return false;
    return requiresRole.includes(userRole);
  }
  return true;
}

export function filterMenuByRole(menuTree: MenuNode[], userRole: string | null): MenuNode[] {
  const result: MenuNode[] = [];
  for (const node of menuTree) {
    if (node.type === 'item') {
      if (checkAccess(node.requiresRole, node.requiresPermission, userRole)) result.push(node);
      continue;
    }
    const filteredChildren = filterMenuByRole(node.children, userRole);
    const groupVisible = checkAccess(node.requiresRole, node.requiresPermission, userRole) && filteredChildren.length > 0;
    if (groupVisible) result.push({ ...node, children: filteredChildren });
  }
  return result;
}
