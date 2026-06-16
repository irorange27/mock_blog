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
|------|----------|
| `content/draft/` | 随手记录，不想入 Git，本地预览即可 |
| front-matter 加 `draft: true` | 需要 Git 版本控制、协作、备份，但暂不发布 |

`draft: true` 的文章可以自由 commit/push，列表、归档、分类、标签、RSS 中都会自动隐藏。去掉 `draft: true`（或删掉该字段）即发布。

### Front-matter 字段

文章是标准 Markdown，需手动填写以下字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| `title` | 文章标题（页面标题 & 列表显示） | `渴求动力` |
| `date` | 发布时间 | `2025-03-05 00:44:57` |
| `categories` | 分类（未填则归为"默认"） | `色伏集` |
| `tags` | 标签列表 | `[随笔]` |
| `description` | 摘要 / SEO 描述 / 列表卡片副标题 | `有意识的生活...` |
| `draft` | 是否草稿（`true` = 隐藏，不上线。未填则为 `false`） | `true` |

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

推送至 `main` 分支后，GitHub Actions 自动执行以下流水线：

```
Test → Build (nuxt generate) → Deploy to GitHub Pages
```

RSS (`/rss.xml`) 和 sitemap (`/sitemap.xml`) 随构建自动更新。

线上地址：[https://blog.niina.fun](https://blog.niina.fun)

## 一图总结

```
pnpm new-post     →    撰写 .md     →    pnpm dev (预览)
                          ↓
                    git add + commit
                          ↓
                     git push origin main
                          ↓
              GitHub Actions 自动构建部署
                          ↓
                   https://blog.niina.fun
```
