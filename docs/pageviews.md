# Page View（阅读量）实现

文章阅读量基于 Cloudflare Workers 的后端能力实现：静态站点不变，同一个 Worker 里加了一层 API，计数存在 Durable Object 的 SQLite 中。

## 架构

```
浏览器（文章页 onMounted）
  │  POST /api/views/<slug>     首次访问：计数 +1 并返回最新值
  │  GET  /api/views/<slug>     同会话再次访问：只读
  ▼
Worker（worker/index.ts）
  ├─ /api/*   → 校验 slug → 转发给单例 Durable Object
  └─ 其余请求 → env.ASSETS.fetch()（nuxt generate 的静态产物，未命中返回 404 页）
                  │
                  ▼
        ViewCounter DO（worker/views.ts）
          一张 SQLite 表：views(slug TEXT PRIMARY KEY, count INTEGER)
          INSERT ... ON CONFLICT ... count + 1（DO 内请求串行，天然原子）
```

关键文件：

- `wrangler.jsonc` —— Workers 配置：静态资产目录、API 路由、DO 绑定与迁移
- `worker/index.ts` —— 请求路由（API vs 静态资产）
- `worker/views.ts` —— `ViewCounter` Durable Object（SQLite 原子计数）
- `app/composables/usePageViews.ts` —— 客户端上报与展示，API 不可用时静默隐藏
- `app/pages/posts/[...slug].vue` —— 文章 meta 行展示「N 次浏览」

## 计数口径

- 同一浏览器会话（sessionStorage）内重复刷新同一篇不重复计数，关闭标签页后再次访问会计数。
- 它统计的是「会话级访问次数」，不是严格去重的 UV；爬虫、RSS 阅读器内打开页面也会计入（无 JS 环境则不计）。
- 计数完全发生在客户端挂载后，预渲染 HTML 和 SEO 不受影响。

## 本地验证

```bash
pnpm generate   # 产出 .output/public（wrangler 的静态资产目录）
pnpm cf:dev     # 本地起 Worker（默认 http://localhost:8787，DO 用本地 SQLite 模拟）
```

```bash
curl -X POST localhost:8787/api/views/test          # {"views":1}
curl -X POST localhost:8787/api/views/test          # {"views":2}
curl localhost:8787/api/views/test                  # {"views":2}
curl localhost:8787/api/views/不存在但格式合法-slug  # {"views":0}
curl localhost:8787/api/views/..%2Fetc              # 400
curl -I localhost:8787/                              # 200（静态资产）
curl -I localhost:8787/no-such-page                  # 404（返回 404 页）
```

注意 `pnpm dev`（Nuxt 开发服务器）没有 `/api` 后端，文章页会静默不显示阅读量，属于预期行为。

## 部署

```bash
npx wrangler login
pnpm deploy    # = nuxt generate && wrangler deploy
```

- 首次部署时 wrangler 会自动按 `migrations`（`new_sqlite_classes`）创建 DO 命名空间，无需手工建库建表。
- 免费额度：DO 每天 10 万次请求、5GB SQLite 存储，个人博客绰绰有余。
- 若 Worker 名称想换，改 `wrangler.jsonc` 里的 `name`。

## 已有 Workers Builds（push 自动部署）的迁移检查单

此前仓库里没有任何 wrangler 配置（git 历史可证），Workers Builds 用的是控制台侧的自动配置。现在 `wrangler.jsonc` 已入库，push 部署会以它为准，需要核对三处：

1. **Worker 名称对齐**：`wrangler.jsonc` 的 `name` 必须和控制台里现有 Worker 改成一致（名字见 Worker 详情页），否则部署会新建一个 Worker，旧域名仍指向旧代码。
2. **构建命令**：控制台 → 该 Worker → Settings → Build → Build command 应为 `pnpm generate`。若之前是 Nuxt 自动配置的默认 `nuxt build`（SSR 模式），不改的话 `.output/public` 里没有预渲染页面，站点会全 404；Deploy command 保持默认 `npx wrangler deploy`。
3. **首次部署看日志**：应出现上传 `worker/index.ts` 与 ViewCounter 的 migration（tag v1）；部署后打开一篇文章确认「N 次浏览」出现，或直接 curl `/api/views/<slug>`。

其他注意：

- 若之前是 SSR 模式，本次起改为静态 + API：页面走边缘预渲染产物，更快更省；副作用是仅靠直链访问的草稿（如 `when-machines-come-alive`）从按需渲染变为 404，与 draft 语义一致。
- 非 main 分支的 push 会生成 preview 版本，绑定相同，读写同一个 DO 的计数。
- 若构建日志中 Node 版本低于 22，在 Settings → Variables 设 `NODE_VERSION=22`。
- 部署无需配置任何 secret（Workers Builds 自带授权），DO 里的计数数据跨部署保留。
- `.github/workflows/build.yml` 仍在并行部署 GitHub Pages（无 `/api`，阅读量自动隐藏，无副作用），确认 Cloudflare 侧稳定后可删掉它的 deploy job。
