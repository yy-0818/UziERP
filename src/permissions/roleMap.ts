/**
 * 角色 → 权限点集合映射
 * 支持新角色编码(platform.owner等)，兼容旧角色(super_admin等)
 */
import { P, type PermissionCode } from './constants';

const ALL_PERMISSIONS: PermissionCode[] = Object.values(P);

const PLATFORM_ADMIN_PERMISSIONS: PermissionCode[] = [
  ...ALL_PERMISSIONS.filter(p => !p.startsWith('admin.')),
  P.ADMIN_AUDITLOG_READ,
];

const SALES_MANAGER_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.SALES_RECORD_READ, P.SALES_RECORD_CREATE, P.SALES_RECORD_UPDATE,
  P.SALES_RECORD_DELETE, P.SALES_RECORD_IMPORT, P.SALES_RECORD_EXPORT,
  P.RECEIPT_RECORD_READ, P.RECEIPT_RECORD_CREATE, P.RECEIPT_RECORD_UPDATE,
  P.RECEIPT_RECORD_IMPORT, P.RECEIPT_RECORD_EXPORT,
  P.PRICING_PRICE_READ, P.PRICING_PRICE_UPDATE, P.PRICING_PRICE_EXPORT,
  P.CONTRACTS_FILE_READ, P.CONTRACTS_FILE_CREATE, P.CONTRACTS_FILE_UPDATE, P.CONTRACTS_FILE_UPLOAD,
  P.MASTER_CUSTOMER_READ, P.MASTER_CUSTOMER_CREATE, P.MASTER_CUSTOMER_UPDATE,
  P.MASTER_PRODUCT_READ, P.MASTER_PRODUCT_CREATE, P.MASTER_PRODUCT_UPDATE,
  P.HR_EMPLOYEE_UZ_READ, P.HR_EMPLOYEE_UZ_MANAGE,
];

const SALES_OPERATOR_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.SALES_RECORD_READ, P.SALES_RECORD_CREATE, P.SALES_RECORD_UPDATE,
  P.SALES_RECORD_IMPORT, P.SALES_RECORD_EXPORT,
  P.RECEIPT_RECORD_READ, P.RECEIPT_RECORD_CREATE, P.RECEIPT_RECORD_UPDATE,
  P.RECEIPT_RECORD_IMPORT, P.RECEIPT_RECORD_EXPORT,
  P.PRICING_PRICE_READ,
  P.CONTRACTS_FILE_READ,
  P.MASTER_CUSTOMER_READ,
  P.MASTER_PRODUCT_READ,
  P.HR_EMPLOYEE_UZ_READ,
];

const PRICING_OPERATOR_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.PRICING_PRICE_READ, P.PRICING_PRICE_UPDATE, P.PRICING_PRICE_EXPORT,
  P.MASTER_CUSTOMER_READ, P.MASTER_PRODUCT_READ,
];

const CONTRACTS_OPERATOR_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.CONTRACTS_FILE_READ, P.CONTRACTS_FILE_CREATE, P.CONTRACTS_FILE_UPDATE,
  P.CONTRACTS_FILE_UPLOAD, P.CONTRACTS_FILE_DELETE,
  P.MASTER_CUSTOMER_READ,
];

const FINANCE_RECEIPT_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.RECEIPT_RECORD_READ, P.RECEIPT_RECORD_CREATE, P.RECEIPT_RECORD_UPDATE,
  P.RECEIPT_RECORD_IMPORT, P.RECEIPT_RECORD_EXPORT,
  P.SALES_RECORD_READ,
  P.MASTER_CUSTOMER_READ,
];

const HR_UZ_ADMIN_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.HR_EMPLOYEE_UZ_READ, P.HR_EMPLOYEE_UZ_MANAGE,
  P.HR_EMPLOYEE_UZ_CREATE, P.HR_EMPLOYEE_UZ_UPDATE,
  P.HR_EMPLOYEE_UZ_DELETE, P.HR_EMPLOYEE_UZ_EXPORT,
];

const HR_CN_ADMIN_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.HR_EMPLOYEE_CN_READ, P.HR_EMPLOYEE_CN_MANAGE, P.HR_EMPLOYEE_CN_PROCESS,
  P.HR_EMPLOYEE_UZ_READ, P.HR_EMPLOYEE_UZ_MANAGE,
];

const VIEWER_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ,
  P.SALES_RECORD_READ, P.RECEIPT_RECORD_READ,
  P.PRICING_PRICE_READ, P.CONTRACTS_FILE_READ,
  P.MASTER_CUSTOMER_READ, P.MASTER_PRODUCT_READ,
  P.HR_EMPLOYEE_UZ_READ,
];

const AUDIT_VIEWER_PERMISSIONS: PermissionCode[] = [
  P.DASHBOARD_READ, P.ADMIN_AUDITLOG_READ,
];

export const ROLE_PERMISSION_MAP: Record<string, PermissionCode[]> = {
  // 新角色编码
  'platform.owner': ALL_PERMISSIONS,
  'platform.admin': PLATFORM_ADMIN_PERMISSIONS,
  'sales.manager': SALES_MANAGER_PERMISSIONS,
  'sales.operator': SALES_OPERATOR_PERMISSIONS,
  'pricing.operator': PRICING_OPERATOR_PERMISSIONS,
  'contracts.operator': CONTRACTS_OPERATOR_PERMISSIONS,
  'finance.receipt.operator': FINANCE_RECEIPT_PERMISSIONS,
  'hr.uz.admin': HR_UZ_ADMIN_PERMISSIONS,
  'hr.cn.admin': HR_CN_ADMIN_PERMISSIONS,
  'biz.viewer': VIEWER_PERMISSIONS,
  'audit.viewer': AUDIT_VIEWER_PERMISSIONS,

};

export function getPermissionsByRole(role: string | null | undefined): Set<PermissionCode> {
  if (!role) return new Set();
  const perms = ROLE_PERMISSION_MAP[role];
  if (!perms) return new Set();
  return new Set(perms);
}

/** 合并多个角色的权限（取并集） */
export function getPermissionsByRoles(roles: string[]): Set<PermissionCode> {
  const all = new Set<PermissionCode>();
  for (const r of roles) {
    for (const p of getPermissionsByRole(r)) all.add(p);
  }
  return all;
}

/** 获取角色显示名 */
export const ROLE_LABELS: Record<string, string> = {
  'platform.owner': '平台拥有者',
  'platform.admin': '系统管理员',
  'sales.manager': '销售主管',
  'sales.operator': '销售专员',
  'pricing.operator': '价格管理员',
  'contracts.operator': '合同管理员',
  'finance.manager': '财务主管',
  'finance.operator': '财务专员',
  'finance.receipt.operator': '财务收款员',
  'hr.uz.admin': '乌方员工管理员',
  'hr.cn.admin': '中方员工管理员',
  'biz.viewer': '业务查看者',
  'audit.viewer': '审计查看者',
};

export const ROLE_TAG_TYPES: Record<string, string> = {
  'platform.owner': 'danger',
  'platform.admin': 'danger',
  'sales.manager': 'warning',
  'sales.operator': 'success',
  'pricing.operator': '',
  'contracts.operator': '',
  'finance.manager': '',
  'finance.operator': '',
  'finance.receipt.operator': 'warning',
  'hr.uz.admin': 'warning',
  'hr.cn.admin': 'danger',
  'biz.viewer': 'info',
  'audit.viewer': 'info',
};
