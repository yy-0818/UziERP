## Uzi管理系统（Vue3 + Supabase）

### 本地开发

1. 安装依赖（在 `price-system` 目录下）：

```bash
npm install
```

2. 配置环境变量（在根目录创建 `.env.local`）：

```bash
VITE_SUPABASE_URL=你的-supabase-url
VITE_SUPABASE_ANON_KEY=你的-anon-key
```

3. 启动开发服务器：

```bash
npm run dev
```

### 部署到 Vercel

1. **推送代码到 GitHub**  
   在项目根目录执行（若尚未初始化仓库）：
   ```bash
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git branch -M main
   git push -u origin main
   ```

2. **在 Vercel 创建项目**  
   - 打开 [vercel.com](https://vercel.com)，登录后点击 **Add New → Project**。  
   - 选择 **Import Git Repository**，选中刚推送的仓库，点击 **Import**。  
   - **Framework Preset** 选 **Vite**（或留空自动检测）。  
   - **Build Command** 保持 `npm run build`，**Output Directory** 保持 `dist`。  
   - **Root Directory** 若项目在子目录（如 `price-system`），填 `price-system`；否则留空。

3. **配置环境变量**  
   在 Vercel 项目页 **Settings → Environment Variables** 中添加：
   - `VITE_SUPABASE_URL`：你的 Supabase 项目 URL（如 `https://xxx.supabase.co`）。  
   - `VITE_SUPABASE_ANON_KEY`：Supabase 的 anon public key。  
   两个都勾选 **Production / Preview / Development**，保存。

4. **部署**  
   点击 **Deploy**。构建完成后会得到一条访问链接（如 `https://xxx.vercel.app`）。  
   前端路由（如 `/business/pricing`）已通过 `vercel.json` 的 rewrites 指向 `index.html`，刷新或直接访问子路径均可。

5. **后续更新**  
   代码推送到 GitHub 的 `main` 分支后，Vercel 会自动重新构建并发布。


### 前端模块拆分约束（SFC 软上限）

- 单个 SFC（`.vue`）建议控制在 **300~400 行**以内。
- 页面层（`*Page.vue`）只负责：状态编排、事件转发、权限控制。
- 新增功能必须按「组件 + composables + API」分层：
  - 组件层：模板与展示交互。
  - composables 层：业务流程（查询、缓存、提交、导出等）。
  - API 层：Supabase 查询与数据整形。
- 超出软上限时，必须继续拆分，不允许把复杂业务直接堆在页面 SFC。
