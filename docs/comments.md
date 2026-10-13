# 评论（Comments）实现

评论是一层自建的 Workers API + Durable Object，挂在同一个 Worker 上：静态站点不变，评论存在 DO 的 SQLite 里。

选型经过见对话记录：giscus（外观归 GitHub Discussions 所有）、Artalk / Waline / Twikoo on Workers（要么接口不原生、要么适配器未发 npm）、Twikoo on Netlify（要新增 Netlify + MongoDB Atlas 两个平台）。最后选自建，理由是本站已经有一个能跑的 Worker + DO，评论沿用同一套模式即可，且**外观归自己**。

## 架构

```
浏览器（文章页 PostComments）
  │  GET    /api/comments/<slug>    读当前文章的评论
  │  POST   /api/comments/<slug>    发表（顶层或回复）
  │  DELETE /api/comments/<id>      博主删除（带 x-comment-token）
  ▼
Worker（worker/index.ts 的 handleComments）
  ├─ 校验 slug → HEAD 静态产物确认文章存在 → 转发给单例 DO
  ├─ DELETE 先比对 COMMENT_ADMIN_TOKEN（常数时间）
  └─ 其余请求 → env.ASSETS.fetch()
                  │
                  ▼
        CommentStore DO（worker/comments.ts）
          comments(id, slug, nick, email, link, body, parent, ip, created)
          comment_rate(ip, hits, window_start)
          全站共用一个实例：评论要跨文章查询，分片反而要再聚合
```

关键文件：

- `wrangler.jsonc` —— `COMMENTS` 绑定与 `v2` 迁移（`new_sqlite_classes`）
- `worker/comments.ts` —— `CommentStore`：建表、校验、限流、读写删
- `worker/index.ts` —— `handleComments` 路由层
- `app/composables/useComments.ts` —— 读取 / 发表 / 删除，含回复树拍平与身份记忆
- `app/components/comments/PostComments.vue` —— 列表 + 表单 + 管理入口
- `app/components/comments/PostComment.vue` —— 单条评论
- `app/utils/comments.ts` —— 相对时间与 Gravatar 哈希
- `app/pages/posts/[...slug].vue` —— 挂载点（`ClientOnly` 包裹）

## 评论树只有两层

数据层不限制嵌套深度（`parent` 只记直接回复目标），但展示时全部拍平成「主楼 + 挂在它下面的回复」：回复的回复会沿 `parent` 上溯到所属主楼。这样既没有深缩进吃屏幕宽度的问题，也不会出现孤儿回复。

`parent` 指向的评论若已不存在，该条按主楼展示，不会消失。

## 身份与安全（本版刻意接受的取舍）

- **昵称 / 邮箱 / 网址是访客自填的，没有服务端会话**，因此任何人理论上都能用别人的昵称留言。防线只有 IP 限流与博主手动删除——这与 Twikoo 的默认姿态一致，属于有意延后，不是遗漏。
- **防 XSS 靠「不解析」**：评论正文按纯文本渲染（`{{ }}` 插值 + `white-space: pre-wrap`），不解析 Markdown、不注入 HTML，所以没有 `v-html`，也没有消毒库要维护。
- **邮箱不落返回体**：`CommentStore` 只把 `id/slug/nick/link/body/parent/created` 回给前端。邮箱留在库里（博主可查），前端要头像时用的是访客**自己**刚填的那个邮箱算的 Gravatar 哈希，别人填的邮箱前端拿不到。
- **IP 只用于限流**：`CF-Connecting-IP` 由 Cloudflare 注入、不可伪造；路由层把它改名成 `x-comment-ip` 后传给 DO，同时丢弃客户端自带的同名头。DO 侧落库 `ip` 供排查，不对外返回。
- **限流**：同一 IP 10 分钟内最多 5 条，超出返回 429。DO 内请求串行，「读计数 → 校验 → 写入 → 记计数」之间没有竞态，不需要事务。

## 博主删除

删除需要 `COMMENT_ADMIN_TOKEN`，**未配置时删除接口整体返回 501**（不会出现「无保护也能删」的状态）。配置：

```bash
npx wrangler secret put COMMENT_ADMIN_TOKEN
```

页面上点「管理」会露出令牌输入框，填对后每条评论旁出现「删除」（删主楼会连带删掉它的回复）。令牌走 `x-comment-token` 请求头，服务端用常数时间比较。

其余延后项：审核后台、邮件通知、Akismet 类反垃圾。等真的收到垃圾评论再说。

## 本地验证

```bash
pnpm test                # 75 个用例，含 DO、路由层与 composable
pnpm typecheck:worker
pnpm generate
pnpm cf:dev              # 起 Worker（默认 http://localhost:8787）
```

```bash
# 发一条
curl -X POST localhost:8787/api/comments/test \
  -H 'Content-Type: application/json' \
  -d '{"slug":"test","nick":"本地","email":"a@b.com","link":"","body":"你好","parent":""}'

# 读回来（不带 email）
curl localhost:8787/api/comments/test

# 回复（parent 填上一条返回的 id）
curl -X POST localhost:8787/api/comments/test \
  -H 'Content-Type: application/json' \
  -d '{"slug":"test","nick":"路人","body":"+1","parent":"<上面的 id>"}'

# 不存在的文章：404，且不建数据
curl localhost:8787/api/comments/no-such-post

# 删除：未配 token 时 501；配上后用 x-comment-token
curl -X DELETE localhost:8787/api/comments/<id> -H 'x-comment-token: <token>'
```

注意 `pnpm dev`（Nuxt 开发服务器）没有 `/api` 后端，评论区会显示「暂时读不到评论」，属预期行为。

## 部署

```bash
pnpm deploy    # = nuxt generate && wrangler deploy
```

- 首次带上 `v2` 迁移部署时，wrangler 会创建 `CommentStore` 的 DO 命名空间；表由 DO 构造函数里的 `CREATE TABLE IF NOT EXISTS` 建，不需要手工建库建表。
- 评论数据跨部署保留，住在 DO 的 SQLite 里。
- 免费额度：DO 每天 10 万次请求、5GB SQLite 存储。评论的写入量极小，个人博客用不到零头。

### CI 与部署的关系

发布只有**手动一条路**：本地跑 `pnpm deploy`（= `nuxt generate && wrangler deploy`），配置以 `wrangler.jsonc` 为准。Worker 没有绑定 Git 仓库，**push 不会自动上线**。

仓库里的 `.github/workflows/build.yml` 只做检查、不发部署：

```plaintext
typecheck:worker → typecheck:ci → test:run → generate → 产物校验 → cf:dry-run
```

- **`typecheck:ci`** 不是「零错误」检查。这个仓库在 main 上就带着 7 处既有类型错误，常红的检查等于没有检查，所以它比对的是一份错误基线（`scripts/typecheck-baseline.json`，粒度是「文件 + 行 + 错误码」）：基线之外的**新增**错误一律拦下，既有问题原样放行。修好既有错误后跑 `pnpm typecheck:update` 收敛基线；想知道当前还剩多少，跑 `pnpm typecheck:report`。
- **产物校验**：`generate` 之后检查 `index.html` / `rss.xml` / `sitemap.xml` 非空、`_nuxt` 存在，并断言 `.output/public/api` **不存在**（`/api` 归 Worker，不该被预渲染）。
- **`cf:dry-run`** 用 `wrangler deploy --dry-run` 提前验证绑定名、DO 类与迁移，这些平时要到 `wrangler deploy` 才会报错。
- **CI 绿灯 ≠ 线上是这份代码**：CI 只证明「能构建」。要让线上更新，还得自己跑一次 `pnpm deploy`。这是刻意的取舍——接上自动构建后，「构建失败但线上是旧的」比「忘了部署」更难发现。
- **GitHub Pages 已关闭**（2026-10）：那份产物没有 `/api`，评论会静默降级，推送两份产出还多一个不一致源。仓库的 Pages 站点已删除；`niina.fun` 根域是另一个项目（`irorange27.github.io`），与本仓库无关。
- **Cloudflare Pages 项目 `blog` 仍在**（`blog-ey3.pages.dev`），但已断开 Git 连接，不再参与发布。留着它是当 Worker 出问题时的回滚备份。

## 已知缺口

- 没有分页：单篇文章最多返回 200 条（`THREAD_MAX`），超出不显示。目前的量级够用，真要爆了再加。
- 没有导出评论的脚本；需要时直接走 DO 查询（`wrangler dev` 或补一个端点），或在 Worker 里临时加一个只读接口。
- `.vue` 文件不参与 CI 类型检查（普通 `tsc` 不认它们，要用 `vue-tsc`）。目前组件里的类型问题只能靠 `pnpm dev` 和构建兜住。
