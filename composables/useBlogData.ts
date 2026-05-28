import type { Post } from '~/types/post'

const normalizePost = (post: any): Post => ({
  ...post,
  _path: post._path || '',
  categories: post.categories || '默认',
  tags: Array.isArray(post.tags) ? post.tags : [],
  date: post.date || new Date().toISOString(),
  title: post.title || 'Untitled',
  description: post.description || ''
})

export function useBlogData() {
  const { data, status, error, refresh } = useAsyncData('blog-posts', () =>
    queryContent('posts').sort({ date: -1 }).find()
  )

  const posts = computed(() =>
    (data.value || []).map(normalizePost)
  )

  const categories = computed(() => {
    const counts: Record<string, number> = {}
    for (const post of posts.value) {
      const cat = post.categories || '默认'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  const tags = computed(() => {
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
    posts.value.filter(post => post.categories === category)

  const getPostsByTag = (tag: string) =>
    posts.value.filter(post => post.tags?.includes(tag))

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
