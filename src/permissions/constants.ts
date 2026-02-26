/**
 * 权限点字典 v1
 * 命名规范: {module}.{resource}.{action}
 * 动作标准: read / create / update / delete / import / export / approve / manage
 */

export const P = {
  // ==================== 销售模块 ====================
  SALES_RECORD_READ: 'sales.record.read',
  SALES_RECORD_CREATE: 'sales.record.create',
  SALES_RECORD_UPDATE: 'sales.record.update',
  SALES_RECORD_DELETE: 'sales.record.delete',
  SALES_RECORD_IMPORT: 'sales.record.import',
  SALES_RECORD_EXPORT: 'sales.record.export',

  // ==================== 收款模块 ====================
  RECEIPT_RECORD_READ: 'receipt.record.read',
  RECEIPT_RECORD_CREATE: 'receipt.record.create',
  RECEIPT_RECORD_UPDATE: 'receipt.record.update',
  RECEIPT_RECORD_DELETE: 'receipt.record.delete',
  RECEIPT_RECORD_IMPORT: 'receipt.record.import',
  RECEIPT_RECORD_EXPORT: 'receipt.record.export',

  // ==================== 价格模块 ====================
  PRICING_PRICE_READ: 'pricing.price.read',
  PRICING_PRICE_UPDATE: 'pricing.price.update',
  PRICING_PRICE_EXPORT: 'pricing.price.export',

  // ==================== 合同模块 ====================
  CONTRACTS_FILE_READ: 'contracts.file.read',
  CONTRACTS_FILE_CREATE: 'contracts.file.create',
  CONTRACTS_FILE_UPDATE: 'contracts.file.update',
  CONTRACTS_FILE_DELETE: 'contracts.file.delete',
  CONTRACTS_FILE_UPLOAD: 'contracts.file.upload',

  // ==================== 主数据 ====================
  MASTER_CUSTOMER_READ: 'master.customer.read',
  MASTER_CUSTOMER_CREATE: 'master.customer.create',
  MASTER_CUSTOMER_UPDATE: 'master.customer.update',
  MASTER_CUSTOMER_DELETE: 'master.customer.delete',

  MASTER_PRODUCT_READ: 'master.product.read',
  MASTER_PRODUCT_CREATE: 'master.product.create',
  MASTER_PRODUCT_UPDATE: 'master.product.update',
  MASTER_PRODUCT_DELETE: 'master.product.delete',

  // ==================== HR 模块 ====================
  HR_EMPLOYEE_UZ_READ: 'hr.employee_uz.read',
  HR_EMPLOYEE_UZ_MANAGE: 'hr.employee_uz.manage',
  HR_EMPLOYEE_UZ_CREATE: 'hr.employee_uz.create',
  HR_EMPLOYEE_UZ_UPDATE: 'hr.employee_uz.update',
  HR_EMPLOYEE_UZ_DELETE: 'hr.employee_uz.delete',
  HR_EMPLOYEE_UZ_EXPORT: 'hr.employee_uz.export',

  HR_EMPLOYEE_CN_READ: 'hr.employee_cn.read',
  HR_EMPLOYEE_CN_MANAGE: 'hr.employee_cn.manage',
  HR_EMPLOYEE_CN_PROCESS: 'hr.employee_cn.process',

  // ==================== 系统管理 ====================
  ADMIN_USER_MANAGE: 'admin.user.manage',
  ADMIN_AUDITLOG_READ: 'admin.auditlog.read',

  // ==================== 仪表盘 ====================
  DASHBOARD_READ: 'dashboard.read',
} as const;

export type PermissionCode = (typeof P)[keyof typeof P];
