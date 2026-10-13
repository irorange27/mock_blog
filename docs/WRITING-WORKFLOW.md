# 写文章流程

## 1. 创建新文章骨架

```bash
pnpm new-post <slug> [title]
```

- `slug` —— 英文文件名 / URL 路径（必填）
- `title` —— 显示标题，支持中文（可选，默认同 slug）

示例：

```bash
pnpm new-post my-thoughts "最近的碎碎念"
```

生成 `content/posts/my-thoughts.md`：

```yaml
---
title: 最近的碎碎念
date: 2026-06-03 08:00:00
categories: ''
tags:
description: ''
draft: true
---
```

新建的文章默认 `draft: true`，不会在列表和 RSS 中出现，写完去掉该行即发布。

## 2. 撰写文章

- **正式文章**放在 `content/posts/`，会被 Git 跟踪、自动构建并发布。
- **辅助草稿**放在 `content/draft/`，该目录已加入 `.gitignore`，不会上传到 GitHub。

### 草稿控制（两种方式）

| 方式 | 适用场景 |
| --- | --- |
| `content/draft/` | 随手记录，不想入 Git，本地预览即可 |
| front-matter 加 `draft: true` | 需要 Git 版本控制、协作、备份，但暂不发布 |

`draft: true` 的文章可以自由 commit/push，列表、归档、分类、标签、RSS 中都会自动隐藏。去掉 `draft: true`（或删掉该字段）即发布。

### Front-matter 字段

文章是标准 Markdown，需手动填写以下字段：

| 字段 | 说明 | 示例 |
| ------ | ------ | ------ |
| `title` | 文章标题（页面标题 & 列表显示） | `渴求动力` |
| `date` | 发布时间 | `2025-03-05 00:44:57` |
| `categories` | 分类（未填则归为"默认"） | `色伏集` |
| `tags` | 标签列表 | `[随笔]` |
| `description` | 摘要 / SEO 描述 / 列表卡片副标题 | `有意识的生活...` |
| `draft` | 是否草稿（`true` = 隐藏，不上线。未填则为 `false`） | `true` |

### 数学公式

行内公式用单个 `$`，行间公式用 `$$`，且**开闭两个 `$$` 必须各自独占一行**：

````markdown
质能关系是 $E = mc^2$。

$$
E = mc^2
$$
````

写成一行的 `$$E = mc^2$$` 会被 remark-math 当成行内公式：行内字号、左对齐、不居中。
`node scripts/check-post.mjs <file>` 会把这种写法报出来。

## 3. 本地预览

```bash
pnpm dev
```

在浏览器中打开 `http://localhost:3000`，所有内容变更自动热更新。

## 4. 发布

将文章文件提交到 Git 并推送到 GitHub：

```bash
git add content/posts/新文章.md
git commit -m "add: 新文章标题"
git push origin main
```

推送至 `main` 分支后，GitHub Actions 跑一遍检查（类型 / 测试 / 静态产物 / Worker 打包）：

```plaintext
typecheck → test → nuxt generate → 产物校验 → wrangler 预检
```

**但这一遍只是检查，不会发布。** 让线上更新还需要手动跑一次：

```bash
pnpm cf:deploy    # = nuxt generate && wrangler deploy
```

**别用 `pnpm deploy` 或 `pnpm publish`** —— 这两个都是 pnpm 的内置命令名
（分别会报 `ERR_PNPM_CANNOT_DEPLOY` 和 `ERR_PNPM_PACKAGE_VERSION_NOT_FOUND`），
pnpm 会优先执行自己的版本而不是 `package.json` 里的脚本。
所以用 `cf:` 前缀，跟 `cf:dev` / `cf:dry-run` 保持一致。

Worker 没有绑定 Git 仓库，push 不会自动上线——**CI 绿灯只说明「能构建」，不说明「线上是它」**。
发完文章记得补这一步，否则本地和线上会不一致。

想先看效果的话，`pnpm cf:dev` 起本地 Worker（有真实的评论接口），
比 `pnpm dev` 更接近线上。

细节见 [comments.md](comments.md#ci-与部署的关系)。

RSS (`/rss.xml`) 和 sitemap (`/sitemap.xml`) 随构建自动更新。

线上地址：[https://blog.niina.fun](https://blog.niina.fun)

## 一图总结

```plaintext
pnpm new-post     →    撰写 .md     →    pnpm dev (预览)
                          ↓
                    git add + commit
                          ↓
                     git push origin main
                          ↓
              GitHub Actions 跑检查（不发布）
                          ↓
                   pnpm cf:deploy （手动，这一步才上线）
                          ↓
                   https://blog.niina.fun
```
