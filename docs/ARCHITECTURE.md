# Blog Architecture

## Stack

- **Framework**: Nuxt 4 + Nuxt Content v3
- **Runtime**: Node.js 24（`.node-version` 与 `engines` 都钉在 24）
- **Package manager**: pnpm 12（`packageManager` 钉版本，构建脚本白名单在 `pnpm-workspace.yaml` 的 `allowBuilds`）
- **Styling**: Tailwind CSS 3 + @tailwindcss/typography
- **Theme**: @nuxtjs/color-mode v4（`nuxt.config.ts` 里显式 `classSuffix: '-mode'`，`main.css` 按 `html.dark-mode` 写）
- **Testing**: Vitest + @nuxt/test-utils
- **Deploy**: Cloudflare Workers — static assets (`nuxt generate`) + Worker API + Durable Object comment store. 手动 `pnpm cf:deploy`，无 Git 自动构建（见 `wrangler.jsonc` 与 `docs/comments.md`）
  - 线上地址：**https://blog.niina.pro** （自定义域，RSS/sitemap 的 `BASE_URL` 与它一致）
  - Worker 原生地址：https://niina-blog.c27shu.workers.dev （未绑自定义域时的兜底入口）

## Directory Structure

```
app/                 # Application source (srcDir)
├── app.vue          # (optional — not present, uses pages/ only)
├── components/      # Auto-imported Vue components
│   ├── SiteNav.vue
│   ├── AuthorProfile.vue
│   ├── RecentMoments.vue
│   ├── ColorModeSwitch.vue
│   ├── FriendLinkItem.vue
│   ├── TableOfContents.vue
│   ├── CodeCopy.vue
│   └── ImageLightbox.vue
├── composables/     # Auto-imported composables
│   ├── useBlogData.ts   # Single source of truth for all post data
├── layouts/
│   ├── default.vue   # Main layout with sidebar
│   └── 404.vue       # Minimal layout for 404
├── pages/           # File-based routing
│   ├── index.vue
│   ├── about.vue
│   ├── archives.vue
│   ├── posts/[...slug].vue
│   ├── categories/index.vue
│   ├── categories/[category].vue
│   ├── tags/[tag].vue
│   ├── links/index.vue
│   └── [...404].vue
├── types/
│   └── post.ts      # Post TypeScript interface
├── utils/
│   └── blog.ts      # Pure functions: formatDate, groupPosts, stats
└── assets/
    └── css/main.css  # Font-face definitions

content/             # Markdown source (Nuxt Content)
├── posts/
├── links/
└── about.md

server/              # Nitro server
└── routes/
    ├── rss.xml.ts
    └── sitemap.xml.ts

worker/              # Cloudflare Worker backend (deployed together with static assets)
├── index.ts         # Router: /api/* → API, everything else → env.ASSETS.fetch()
└── types.ts         # Minimal structural types for CF bindings

wrangler.jsonc       # Workers config: assets dir, /api routing, DO binding + migration

public/              # Static assets
├── avatar.png
├── favicon.ico
└── robots.txt

tests/               # Test files (root-level)
├── composables/useBlogData.test.ts
└── utils/blog.test.ts
```

## Data Flow

```
Components (auto-imported from app/components/)
  └─ useBlogData()              ← composable (auto-imported)
       └─ useAsyncData()        ← Nuxt built-in: handles fetch, cache, SSR, status, error
            └─ queryContent()   ← Nuxt Content: reads markdown files
       ├─ posts     ← computed, normalized from raw data
       ├─ categories ← computed, derived from posts
       └─ tags       ← computed, derived from posts
```

**Key invariant**: `useBlogData()` wraps a single `useAsyncData` call. All data, loading state, and errors flow through Nuxt's built-in mechanisms. Categories and tags are derived (computed) from posts, never fetched independently. Multiple components calling `useBlogData()` share the same cached data via Nuxt's hydration.

## Frontmatter Schema

```yaml
---
title: string          # required
date: string           # ISO date, required
draft: boolean         # defaults to false — set true to hide from listing/RSS
categories: string     # defaults to '默认'
tags: string[]         # defaults to []
description: string    # used in post list
---
```

## Development

Node 24 + pnpm 12。`pnpm install` 首次会跑 `postinstall`（`nuxt prepare` + 挂 `.githooks`）。

构建脚本白名单在 `pnpm-workspace.yaml` 的 `allowBuilds`（pnpm 11 起不再读 `package.json` 的 `pnpm.onlyBuiltDependencies`）。少一个包就会在 install 末尾报 `ERR_PNPM_IGNORED_BUILDS`；补白名单用 `pnpm approve-builds`。

依赖升级时的两个已知坑：`tailwindcss` 必须留在 v3（v4 换掉了 PostCSS 插件入口）；`postcss.plugins` 里显式把 `tailwindcss/nesting` 设为 `false`，否则 Nuxt 4.6 用原生 `import()` 解析插件时会报 `NUXT_B7027`。

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm generate      # Static site generation
pnpm test          # Run vitest
pnpm new-post <name>  # Create new post
pnpm cf:dev        # Preview Worker + static assets locally (run pnpm generate first)
pnpm cf:deploy    # nuxt generate && wrangler deploy (Cloudflare Workers)
```
