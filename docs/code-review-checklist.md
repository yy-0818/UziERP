# Code Review Checklist

## 数据访问层约束

- [ ] 页面层（`src/pages/**`、`src/modules/**/**Page.vue`）不得直接 `import ... from '../supabase'` 或任何 `supabase` 实例。
- [ ] 页面仅可调用 `src/services/**` 或 `src/modules/*/api.ts` 暴露的方法获取/提交数据。
- [ ] 新增 CRUD 时需要在 api/service 层统一异常映射，页面仅消费可读错误文案（例如 `error.message`）。

> 当前项目采用 checklist 执行该约束；如后续引入 ESLint，可将其升级为自动规则。
