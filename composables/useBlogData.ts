import type { Post } from '~/types/post'

export interface BlogDataState {
  posts: Post[]
  isLoading: boolean
  error: Error | null
}

export interface BlogDataActions {
  fetchPosts: (forceRefresh?: boolean) => Promise<Post[]>
  getPostByPath: (path: string) => Post | undefined
  getPostsByCategory: (category: string) => Post[]
  getPostsByTag: (tag: string) => Post[]
  categories: ComputedRef<Array<{ name: string; count: number }>>
  tags: ComputedRef<Array<{ name: string; count: number }>>
  refreshData: () => Promise<Post[]>
}

const normalizePost = (post: any): Post => ({
  ...post,
  _path: post._path || '',
  categories: post.categories || '默认',
  tags: Array.isArray(post.tags) ? post.tags : [],
  date: post.date || new Date().toISOString(),
  title: post.title || 'Untitled',
  description: post.description || ''
})

export const useBlogData = (): BlogDataState & BlogDataActions => {
  const posts = useState<Post[]>('blog-posts', () => [])
  const isLoading = useState<boolean>('blog-posts-loading', () => false)
  const error = useState<Error | null>('blog-posts-error', () => null)

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

  const fetchPosts = async (forceRefresh = false): Promise<Post[]> => {
    if (!forceRefresh && posts.value.length > 0) {
      return posts.value
    }

    try {
      isLoading.value = true
      error.value = null

      const cacheKey = forceRefresh ? `posts-${Date.now()}` : 'blog-posts-data'

      const { data, error: asyncError } = await useAsyncData(cacheKey, () =>
        queryContent('posts')
          .sort({ date: -1 })
          .find()
      )

      if (asyncError?.value) {
        throw asyncError.value
      }

      posts.value = data.value && Array.isArray(data.value)
        ? data.value.map(normalizePost)
        : []

      return posts.value
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch posts')
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getPostByPath = (path: string): Post | undefined =>
    posts.value.find(post => post._path === path)

  const getPostsByCategory = (category: string): Post[] =>
    posts.value.filter(post => post.categories === category)

  const getPostsByTag = (tag: string): Post[] =>
    posts.value.filter(post => Array.isArray(post.tags) && post.tags.includes(tag))

  const refreshData = (): Promise<Post[]> => fetchPosts(true)

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    getPostByPath,
    getPostsByCategory,
    getPostsByTag,
    categories,
    tags,
    refreshData
  }
}
