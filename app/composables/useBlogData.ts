import type { Post, CategoryCount, TagCount } from '~/types/post'
import type { QueryBuilderParams } from '@nuxt/content'

const normalizePost = (post: Record<string, unknown>): Post => ({
  _path: (post._path as string) || '',
  categories: (post.categories as string) || '默认',
  tags: Array.isArray(post.tags) ? (post.tags as string[]) : [],
  date: (post.date as string) || new Date().toISOString(),
  title: (post.title as string) || 'Untitled',
  description: (post.description as string) || '',
  body: post.body as Post['body'],
})

export function useBlogData() {
  const { data, status, error, refresh } = useAsyncData('blog-posts', () =>
    queryContent('posts').sort({ date: -1 }).find()
  )

  const posts = computed(() =>
    (data.value || []).map(normalizePost)
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

  const getPostsByCategory = (category: string) =>
    computed(() => posts.value.filter(post => post.categories === category))

  const getPostsByTag = (tag: string) =>
    computed(() => posts.value.filter(post => post.tags?.includes(tag)))

  return {
    posts,
    status,
    error,
    refresh,
    categories,
    tags,
    getPostsByCategory,
    getPostsByTag,
  }
}
