-- ============================================================
-- UziERP RBAC 权限模型数据库迁移
-- 执行位置：Supabase SQL Editor
-- 分阶段执行，每个阶段独立可回滚
-- ============================================================

-- ======================== 阶段一：权限基础表 ========================

-- 1. 角色模板表（替代原来的硬编码字符串）
CREATE TABLE IF NOT EXISTS roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text NOT NULL UNIQUE,           -- 如 'platform.admin', 'sales.operator'
  name        text NOT NULL,                  -- 显示名称，如 '销售操作员'
  description text,
  is_system   boolean DEFAULT false,          -- 系统内置角色不可删除
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE roles IS '角色模板表';
COMMENT ON COLUMN roles.code IS '角色编码，命名规范: {scope}.{name}';
COMMENT ON COLUMN roles.is_system IS '系统内置角色，不可通过管理端删除';

-- 2. 权限点表
CREATE TABLE IF NOT EXISTS permissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text NOT NULL UNIQUE,           -- 如 'sales.record.read'
  name        text NOT NULL,                  -- 显示名称，如 '查看销售记录'
  module      text NOT NULL,                  -- 所属模块，如 'sales'
  resource    text NOT NULL,                  -- 资源，如 'record'
  action      text NOT NULL,                  -- 动作，如 'read'
  description text,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE permissions IS '权限点表，命名规范: {module}.{resource}.{action}';
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- 3. 角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id       uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS '角色与权限点的多对多绑定';
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ======================== 阶段二：改造 user_roles ========================

-- 4. 扩展 user_roles 表（兼容旧结构 + 支持新结构）
--    旧结构: user_id + role (text)
--    新增:   role_id (uuid) 指向 roles 表，支持多角色

-- 4a. 添加 role_id 列（可空，兼容期旧数据无此值）
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);
-- 4b. 添加多角色支持的唯一约束
-- ALTER TABLE user_roles ADD CONSTRAINT uq_user_role UNIQUE(user_id, role_id);
-- 4c. 添加生效时间（可选，支持权限有效期）
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS effective_from timestamptz;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS effective_to   timestamptz;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS granted_by     uuid;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS granted_at     timestamptz DEFAULT now();

COMMENT ON COLUMN user_roles.role_id IS '关联到 roles 表（新模型），与旧 role 字段并存';
COMMENT ON COLUMN user_roles.effective_from IS '权限生效开始时间，null=立即生效';
COMMENT ON COLUMN user_roles.effective_to IS '权限生效结束时间，null=永久有效';
COMMENT ON COLUMN user_roles.granted_by IS '授权操作人 user_id';

-- ======================== 阶段三：数据域策略 ========================

-- 5. 数据域策略表
CREATE TABLE IF NOT EXISTS data_scopes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,                  -- 如 '本人数据', '本部门数据'
  scope_type  text NOT NULL,                  -- SELF / DEPT / DEPT_AND_CHILDREN / ORG / CUSTOM
  description text,
  -- CUSTOM 类型的条件表达式（JSON），后端解析
  custom_condition jsonb,
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE data_scopes IS '数据范围策略';
COMMENT ON COLUMN data_scopes.scope_type IS 'SELF=本人 / DEPT=本部门 / DEPT_AND_CHILDREN=本部门及下级 / ORG=全组织 / CUSTOM=自定义';

-- 6. 角色-权限-数据域关联表
CREATE TABLE IF NOT EXISTS role_permission_scopes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id         uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id   uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  data_scope_id   uuid NOT NULL REFERENCES data_scopes(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE role_permission_scopes IS '角色在某权限点上的数据范围绑定';

-- ======================== 阶段四：初始化数据 ========================

-- 7. 插入系统内置角色（与前端 roleMap.ts 对应）
INSERT INTO roles (code, name, description, is_system) VALUES
  ('platform.owner',           '平台拥有者',   '最高权限，拥有所有权限点',         true),
  ('platform.admin',           '系统管理员',   '系统配置、用户权限管理',           true),
  ('sales.operator',           '销售操作员',   '销售录入/编辑、收款操作',          true),
  ('sales.manager',            '销售经理',     '销售审核、导出、删除',             true),
  ('pricing.operator',         '价格维护员',   '产品价格查询与维护',               true),
  ('contracts.operator',       '合同操作员',   '合同与附件上传维护',               true),
  ('finance.receipt.operator', '收款操作员',   '收款录入与维护',                   true),
  ('hr.cn.admin',              'HR管理员',     '中国员工模块全权限',               true),
  ('biz.viewer',               '业务查看者',   '业务数据只读',                     true),
  ('audit.viewer',             '审计查看者',   '操作日志与报表只读',               true)
ON CONFLICT (code) DO NOTHING;

-- 8. 插入权限点（与前端 permissions/constants.ts 对应）
INSERT INTO permissions (code, name, module, resource, action) VALUES
  -- 销售
  ('sales.record.read',       '查看销售记录',   'sales',     'record',  'read'),
  ('sales.record.create',     '新增销售记录',   'sales',     'record',  'create'),
  ('sales.record.update',     '编辑销售记录',   'sales',     'record',  'update'),
  ('sales.record.delete',     '删除销售记录',   'sales',     'record',  'delete'),
  ('sales.record.import',     '导入销售数据',   'sales',     'record',  'import'),
  ('sales.record.export',     '导出销售数据',   'sales',     'record',  'export'),
  -- 收款
  ('receipt.record.read',     '查看收款记录',   'receipt',   'record',  'read'),
  ('receipt.record.create',   '新增收款记录',   'receipt',   'record',  'create'),
  ('receipt.record.update',   '编辑收款记录',   'receipt',   'record',  'update'),
  ('receipt.record.delete',   '删除收款记录',   'receipt',   'record',  'delete'),
  ('receipt.record.import',   '导入收款数据',   'receipt',   'record',  'import'),
  ('receipt.record.export',   '导出收款数据',   'receipt',   'record',  'export'),
  -- 价格
  ('pricing.price.read',      '查看价格',       'pricing',   'price',   'read'),
  ('pricing.price.update',    '维护价格',       'pricing',   'price',   'update'),
  ('pricing.price.export',    '导出价格',       'pricing',   'price',   'export'),
  -- 合同
  ('contracts.file.read',     '查看合同',       'contracts', 'file',    'read'),
  ('contracts.file.create',   '新建合同',       'contracts', 'file',    'create'),
  ('contracts.file.update',   '编辑合同',       'contracts', 'file',    'update'),
  ('contracts.file.delete',   '删除合同',       'contracts', 'file',    'delete'),
  ('contracts.file.upload',   '上传合同附件',   'contracts', 'file',    'upload'),
  -- 主数据
  ('master.customer.read',    '查看客户',       'master',    'customer','read'),
  ('master.customer.create',  '新增客户',       'master',    'customer','create'),
  ('master.customer.update',  '编辑客户',       'master',    'customer','update'),
  ('master.customer.delete',  '删除客户',       'master',    'customer','delete'),
  ('master.product.read',     '查看产品',       'master',    'product', 'read'),
  ('master.product.create',   '新增产品',       'master',    'product', 'create'),
  ('master.product.update',   '编辑产品',       'master',    'product', 'update'),
  ('master.product.delete',   '删除产品',       'master',    'product', 'delete'),
  -- HR
  ('hr.employee_uz.read',     '查看乌兹员工',   'hr',        'employee_uz', 'read'),
  ('hr.employee_uz.manage',   '管理乌兹员工',   'hr',        'employee_uz', 'manage'),
  ('hr.employee_cn.read',     '查看中国员工',   'hr',        'employee_cn', 'read'),
  ('hr.employee_cn.manage',   '管理中国员工',   'hr',        'employee_cn', 'manage'),
  ('hr.employee_cn.process',  '流程办理',       'hr',        'employee_cn', 'process'),
  -- 系统管理
  ('admin.user.manage',       '用户权限管理',   'admin',     'user',    'manage'),
  ('admin.auditlog.read',     '查看操作日志',   'admin',     'auditlog','read'),
  -- 仪表盘
  ('dashboard.read',          '查看仪表盘',     'dashboard', 'overview','read')
ON CONFLICT (code) DO NOTHING;

-- 9. 绑定角色权限（以 platform.owner 为例，拥有全部权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'platform.owner'
ON CONFLICT DO NOTHING;

-- 10. 绑定 biz.viewer 角色的只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'biz.viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ======================== 阶段五：旧数据迁移 ========================

-- 11. 将现有 user_roles.role 字符串映射到新 roles 表
-- 执行前请先确认 roles 表已有数据
/*
UPDATE user_roles ur
SET role_id = r.id
FROM roles r
WHERE (ur.role = 'super_admin'  AND r.code = 'platform.owner')
   OR (ur.role = 'manager'      AND r.code = 'sales.manager')
   OR (ur.role = 'sales'        AND r.code = 'sales.operator')
   OR (ur.role = 'viewer'       AND r.code = 'biz.viewer');
*/

-- ======================== 阶段六：RLS 策略示例 ========================

-- 12. 为 sales_records 表添加基于权限的 RLS（示例）
/*
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_read_policy" ON sales_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.code = 'sales.record.read'
        AND (ur.effective_to IS NULL OR ur.effective_to > now())
    )
  );
*/

-- ============================================================
-- 执行顺序建议：
-- 1. 先执行阶段一（创建基础表）
-- 2. 执行阶段四（初始化数据）
-- 3. 验证前端正常后，执行阶段二（扩展user_roles）
-- 4. 执行阶段五（数据迁移）
-- 5. 前端切换到读取数据库权限后，执行阶段三+六
-- ============================================================
