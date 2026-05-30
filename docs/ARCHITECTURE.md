# Blog Architecture

## Stack

- **Framework**: Nuxt 4 + Nuxt Content v2
- **Styling**: Tailwind CSS + @tailwindcss/typography
- **Theme**: @nuxtjs/color-mode (dark/light)
- **Testing**: Vitest + @nuxt/test-utils
- **Deploy**: Cloudflare Pages (static generation via `nuxt generate`)

## Directory Structure

```
app/                 # Application source (srcDir)
├── app.vue          # (optional — not present, uses pages/ only)
├── components/      # Auto-imported Vue components
│   ├── NavBar.vue
│   ├── ProfileCard.vue
│   ├── CategoriesCard.vue
│   ├── TagCard.vue
│   ├── ColorModeSwitch.vue
│   ├── FriendLinkItem.vue
│   ├── TableOfContents.vue
│   ├── CodeCopy.vue
│   └── ImageLightbox.vue
├── composables/     # Auto-imported composables
│   └── useBlogData.ts   # Single source of truth for all post data
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
categories: string     # defaults to '默认'
tags: string[]         # defaults to []
description: string    # used in post list
---
```

## Development

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm generate      # Static site generation
pnpm test          # Run vitest
pnpm new-post <name>  # Create new post
```
