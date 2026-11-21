import type { CategoryCount, TagCount } from '~/types/post'
import { normalizePost } from '~/utils/blog'

export function useBlogData() {
  // 只取列表/侧栏需要的元信息字段：带上 body 会让全站每页 payload 膨胀数百 KB
  // 生产构建直接在查询层滤掉草稿：useAsyncData 会把整份结果序列化进 payload，
  // 只在前端过滤的话，草稿的标题与 description 仍会出现在公开的 /posts/_payload.json 里
  const { data, status, error, refresh } = useAsyncData('blog-posts', () => {
    const query = queryCollection('posts')
      .select('path', 'title', 'description', 'date', 'categories', 'tags', 'draft')
    return (import.meta.env.DEV ? query : query.where('draft', '=', false))
      .order('date', 'DESC')
      .all()
  })

  const allPosts = computed(() =>
    (data.value || []).map(normalizePost)
  )

  const posts = computed(() =>
    allPosts.value.filter(post => !post.draft)
  )

  // 草稿不进任何公开列表，但本地预览需要一处能点到它们的入口（见 pages/drafts.vue）。
  // 用 import.meta.env.DEV 而不是 import.meta.dev：后者在客户端是 undefined（Vite 只注入
  // import.meta.env），SSR 时为 true，导致首屏有草稿列表、水合后又被清空。
  const drafts = computed(() =>
    import.meta.env.DEV ? allPosts.value.filter(post => post.draft) : []
  )

  const categories = computed<CategoryCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const post of posts.value) {
      const cat = post.categories || '默认'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const tags = computed<TagCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const post of posts.value) {
      for (const tag of post.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  // 接受 getter：route.params 变化时筛选结果跟着变
  const getPostsByCategory = (category: () => string) =>
    computed(() => posts.value.filter(post => post.categories === category()))

  const getPostsByTag = (tag: () => string) =>
    computed(() => posts.value.filter(post => post.tags?.includes(tag())))

  return {
    posts,
    drafts,
    status,
    error,
    refresh,
    categories,
    tags,
    getPostsByCategory,
    getPostsByTag,
  }
}
