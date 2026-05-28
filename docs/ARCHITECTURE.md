# Blog Architecture

## Stack

- **Framework**: Nuxt 3 + Nuxt Content v2
- **Styling**: Tailwind CSS + @tailwindcss/typography
- **Theme**: @nuxtjs/color-mode (dark/light)
- **Testing**: Vitest + @nuxt/test-utils
- **Deploy**: GitHub Pages (static generation via `nuxt generate`)

## Directory Structure

```
pages/              # File-based routing
  index.vue         # Home — paginated post list
  posts/[...slug].vue  # Post detail with TOC
  categories/       # Category list + filtered view
  tags/[tag].vue    # Tag-filtered post list
  archives.vue      # Year/month archive view
  links/            # Friend links
  about.vue         # About page

components/         # Reusable Vue components
  NavBar.vue        # Top navigation bar
  ProfileCard.vue   # Sidebar profile with avatar + GitHub
  CategoriesCard.vue # Sidebar categories
  TagCard.vue       # Sidebar tags
  ColorModeSwitch.vue # Dark/light toggle
  FriendLinkItem.vue  # Single friend link card
  TableOfContents.vue # Post TOC renderer

composables/        # Shared composable functions
  useBlogData.ts    # Singleton data layer (posts, categories, tags)
  useErrorHandler.ts # Standardized error handling + retry

utils/
  blog.ts           # Pure functions: formatDate, groupPosts, stats

types/
  post.ts           # Post TypeScript interface

content/            # Markdown source files
  posts/            # Blog posts (frontmatter: title, date, categories, tags)
  links/            # Friend link definitions
  about.md          # About page content

server/routes/
  rss.xml.ts        # RSS feed endpoint
```

## Data Flow

```
Components
  └─ useBlogData()          ← singleton via useState
       ├─ posts             ← shared reactive state
       ├─ categories        ← computed from posts
       ├─ tags              ← computed from posts
       └─ fetchPosts()      ← calls queryContent('posts')
            └─ Nuxt Content → markdown files
```

**Key invariant**: `useBlogData()` is called from many components (NavBar, sidebar, pages), but `useState` ensures a single shared state. Categories and tags are derived (computed) from posts, never fetched independently.

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
