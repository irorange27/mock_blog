import type { CategoryCount, TagCount } from '~/types/post'
import { normalizePost } from '~/utils/blog'
import type { QueryBuilderParams } from '@nuxt/content'

export function useBlogData() {
  // 只取列表/侧栏需要的元信息字段：带上 body 会让全站每页 payload 膨胀数百 KB
  const { data, status, error, refresh } = useAsyncData('blog-posts', () =>
    queryContent('posts')
      .only(['_path', 'title', 'description', 'date', 'categories', 'tags', 'draft'])
      .sort({ date: -1 })
      .find()
  )

  const allPosts = computed(() =>
    (data.value || []).map(normalizePost)
  )

  const posts = computed(() =>
    allPosts.value.filter(post => !post.draft)
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
