## Cursor Cloud specific instructions

This is a Vue 3 + TypeScript + Supabase frontend app (Vite-based). No backend services run locally; it connects to a remote Supabase instance configured via `.env.local`.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` (currently a no-op) |
| Test | `npm run test` (vitest) |

### Notes

- **Tests**: vitest is configured (`npm run test`). Tests live alongside source code in `__tests__/` directories (e.g. `src/modules/*/composables/__tests__/`).
- **Lint** is a placeholder (`echo "no linter configured"`). TypeScript type-checking is done implicitly during `npm run build` (Vite + vue-tsc is not wired up separately; the build uses `vite build` which transpiles but does not full-typecheck).
- **Supabase credentials** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are required in `.env.local` to run the app at runtime. The build succeeds without them since they're only read at runtime.
- The `src/modules/sales/composables/` directory contains extracted composables from the large `SalesPage.vue`. These are pure TypeScript files that compile as part of the Vite build.

### 权限模型（统一入口）

- **禁止**在页面/组件中直接使用 `auth.role`、`auth.roles` 做权限判断，或使用 `hasAnyRole`/`hasRole`。一律使用 `usePermission()` 的 `can(permission)`、`canAny(...)`、`canAll(...)`，或指令 `v-can="'permission.code'"`。
- 权限点定义在 `src/permissions/constants.ts`（`P`），路由/菜单使用 `meta.permissions` 或 `requiresPermissions`，未授权跳转至 `/forbidden`（403 页）。
- 若后续接入 ESLint，建议增加规则禁止：`auth.role ===`、`auth.roles` 用于显隐、`hasAnyRole`/`hasRole` 的引用。
