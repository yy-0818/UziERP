# ERP 前端代码审查报告（UziERP）

## 执行摘要

本次审查聚焦于典型 ERP 风险维度：**稳定性、数据一致性、性能可扩展性、多人协作可维护性**。当前代码总体可运行、业务覆盖较完整（含路由鉴权、数据导入导出、状态持久化），但存在几个高优先级隐患：

1. `SalesPage.vue` 体量过大（1555 行），职责耦合严重，已接近“不可安全演进”边界。
2. TypeScript 类型约束不足（大量 `any`），对复杂业务字段和批量导入流程缺乏编译期保护。
3. 鉴权策略以前端路由/按钮为主，缺乏统一“权限守卫 + 审计埋点”基线，存在误操作与越权感知不一致风险。
4. 关键异步流程存在“只提示不分级”和 `console.error` 直出，运维可观测性不足。
5. 国际化、可访问性、错误边界等基础工程能力尚未建立，会影响长期扩展与合规。

---

## 详细分析（按优先级）

## P0（最高优先级，建议立即治理）

### 1) 超大单文件组件导致维护与回归风险激增

**具体位置**
- `src/modules/sales/SalesPage.vue`（1555 行）

**表现形式（片段）**
```vue
<template>
  <!-- 大量表格、筛选、导入、批量粘贴、弹窗编辑、分页、持久化逻辑集中在同一文件 -->
</template>
```

**潜在风险**
- 任一需求改动都可能触发跨模块副作用（筛选、导入、分页、弹窗互相影响）。
- Code Review 成本过高，缺陷逃逸率上升。
- 新成员接手难度大，交付周期延长。

**改进建议**
- 将页面拆分为“容器页 + 领域子组件 + composable”。
- 推荐拆分：
  - `SalesToolbar.vue`
  - `SalesTable.vue`
  - `ReceiptTable.vue`
  - `SalesEditDialog.vue`
  - `ImportDialog.vue`
  - `useSalesFilters.ts` / `useSalesImport.ts` / `useSalesPersistence.ts`

**代码示例（重构方向）**
```ts
// useSalesPersistence.ts
export function useSalesPersistence(state: Ref<SalesUiState>) {
  const restore = () => { /* localStorage restore */ };
  const persist = () => { /* localStorage persist */ };
  return { restore, persist };
}
```

**注意事项**
- 先“等价重构”后“逻辑优化”，避免一次性改动过大。
- 通过契约类型（接口）约束子组件输入输出，减少回归。

**预期收益**
- 单文件规模下降 50%~70%。
- 评审效率提升（预估 30%+）。
- 缺陷定位时间明显缩短。

---

### 2) 关键业务数据大量使用 `any`，类型系统防护不足

**具体位置**
- `src/stores/auth.ts`
- `src/pages/Customers.vue`
- `src/modules/sales/SalesPage.vue`

**表现形式（片段）**
```ts
const user = ref<any | null>(null);
const rows = ref<any[]>([]);
const salesForm = ref<any>({});
```

**潜在风险**
- 批量导入、字段映射、金额换算等场景下，字段名拼写错误无法在编译期暴露。
- 表单新增字段时易出现“前端可填、后端未接收”或“导出缺列”。

**改进建议**
- 统一建立 `types/sales.ts`、`types/auth.ts`、`types/master-data.ts`。
- 将 `ref<any>` 改为 `ref<SalesFormModel>`、`ref<CustomerRecord[]>` 等。

**代码示例（改造后）**
```ts
interface SalesFormModel {
  document_no: string;
  customer_name: string;
  amount_usd: number | null;
  exchange_rate: number | null;
}

const salesForm = ref<SalesFormModel>({
  document_no: '',
  customer_name: '',
  amount_usd: null,
  exchange_rate: null,
});
```

**注意事项**
- 先从“新增/编辑/导入”高风险链路开始替换。
- 和后端字段字典保持一一映射，避免隐式转换。

**预期收益**
- 低级字段错误减少 40%+。
- 重构信心提升，回归范围可控。

---

## P1（高优先级，建议 1~2 个迭代内完成）

### 3) 权限控制缺少统一策略层，存在前后端感知不一致

**具体位置**
- `src/router/index.ts`（路由层 `requiresRole`）
- `src/pages/Customers.vue`（按钮级 `canEdit`）

**表现形式（片段）**
```ts
const needRoles = to.meta.requiresRole as string[] | undefined;
if (needRoles && !needRoles.includes(auth.role || '')) {
  return next('/business/pricing');
}
```

```ts
const canEdit = computed(() => ['super_admin', 'manager'].includes(auth.role || ''));
```

**潜在风险**
- 页面级与按钮级权限规则分散，后续容易出现规则漂移。
- 若后端 RLS/接口权限与前端不一致，用户体验会出现“按钮可见但提交失败”。

**改进建议**
- 抽象 `usePermission()` 或 `permissionService`，统一判定入口。
- 建立“前端权限仅做体验优化，后端权限做最终裁决”的规范。
- 对拒绝操作增加审计埋点（用户、模块、动作、拒绝原因）。

**预期收益**
- 权限规则单一来源（SSOT），减少策略分叉。
- 安全审计可追踪。

---

### 4) 异步错误处理分级不足，可观测性弱

**具体位置**
- `src/modules/sales/SalesPage.vue` 多处 `catch (e: any)`
- `src/modules/sales/SalesPage.vue` 存在 `console.error('import failed', e)`
- `src/stores/auth.ts` 的 `loadUser()` 缺少显式错误分级

**潜在风险**
- 网络异常、业务冲突、权限拒绝都被统一成 Toast，排障成本高。
- 线上问题缺少结构化日志，无法高效追因。

**改进建议**
- 统一错误模型：`BusinessError / ValidationError / NetworkError / AuthError`。
- 关键链路（登录、导入、保存）增加埋点与错误标签。
- 对可重试错误提供“重试”交互。

**预期收益**
- MTTR（故障恢复时间）下降。
- 业务团队反馈问题时可直接定位环节。

---

## P2（中优先级，纳入技术债务计划）

### 5) 国际化与可访问性尚未体系化

**具体位置**
- 多个页面文本硬编码（如 `src/pages/Customers.vue`, `src/modules/sales/SalesPage.vue`）

**潜在风险**
- 多语言扩展成本高。
- 键盘导航、读屏场景下可用性受限，影响合规和外部协作。

**改进建议**
- 建立 i18n 资源层（先中文 key 化，再增语言包）。
- 为关键交互组件补齐 ARIA 语义与焦点管理规范。

**预期收益**
- 国际化改造成本可控。
- 可访问性评分提升。

---

### 6) 定时持久化逻辑缺少卸载清理，存在轻微泄漏窗口

**具体位置**
- `src/modules/sales/SalesPage.vue`（`persistTimer`）

**表现形式（片段）**
```ts
let persistTimer: ReturnType<typeof setTimeout> | null = null;
// 未见 onUnmounted 中 clearTimeout
```

**潜在风险**
- 页面快速切换时存在残留定时器执行窗口（虽风险较低，但可避免）。

**改进建议**
```ts
onUnmounted(() => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
});
```

**预期收益**
- 降低潜在内存/副作用风险。

---

## 重构策略

### 高优先级重构（立即执行，1 个迭代）
1. `SalesPage.vue` 先做结构拆分，不改业务逻辑。
2. 给销售与主数据链路补齐核心类型定义，清理高风险 `any`。
3. 落地统一权限判定入口，路由与按钮共同复用。
4. 关键动作接入结构化日志与错误分级。

### 中长期优化（2~4 个迭代）
1. 建立“页面容器 + composable + API 层 + 类型层”分层规范。
2. 建立前端错误边界、降级页和异常恢复策略。
3. 推进 i18n 与可访问性基线（可先覆盖核心业务路径）。
4. 建立性能基线指标（首屏、表格渲染、导入耗时、接口错误率）。

---

## 专项检查清单

- [x] **内存泄漏风险**：发现 `setTimeout` 清理缺口（`SalesPage.vue`）。
- [x] **无限循环隐患**：`watch(..., { deep: true })` 存在，需要关注对象引用变更策略。
- [x] **错误边界**：未见 React/Vue 错误边界方案（`App.vue` 仅 `router-view`）。
- [x] **权限控制**：已有路由+按钮控制，但缺统一策略层。
- [x] **国际化支持**：存在硬编码文本。
- [x] **可访问性**：未见系统化 ARIA/键盘导航规范。
- [ ] **日志监控**：暂未发现统一埋点 SDK/规范。
- [ ] **兼容性**：未见浏览器矩阵与降级策略文档。

---

## 附录：代码规范检查结果

- 优点：
  - 已使用 TypeScript + Composition API + 模块化路由。
  - 鉴权基础（登录态 + 路由守卫）存在。
  - API 错误映射（`mapApiError`）有统一雏形。

- 主要规范缺口：
  - `any` 使用比例偏高。
  - 单文件组件过大。
  - 异常分级与日志监控不完整。
  - i18n / a11y / 错误边界等工程基线未建立。
