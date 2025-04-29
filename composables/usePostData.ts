import { ref } from 'vue'
import type { Post } from '../types/post'

export const usePostData = () => {
  const DEFAULT_CATEGORY = '默认'
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // 处理文章数据，确保每篇文章都有分类和标签
  const normalizePost = (post: Post): Post => {
    const normalized: Post = {
      ...post,
      _path: encodeURI(post._path),
      categories: post.categories || DEFAULT_CATEGORY,
      tags: Array.isArray(post.tags) ? post.tags : [],
      date: post.date || new Date().toISOString()
    }
    console.log('Normalized post:', normalized)
    return normalized
  }

  // 获取所有文章
  const getPosts = async (forceRefresh = false) => {
    try {
      isLoading.value = true
      error.value = null
      console.log('Fetching posts...')
      
      // 使用更具体的缓存键，包含时间戳以确保直接访问时获取新数据
      const cacheKey = forceRefresh ? 
        `posts-list-${Date.now()}` : 
        'posts-list'
      
      const { data } = await useAsyncData(cacheKey, () => 
        queryContent('posts')
        .sort({ date: -1 })
        .find(),
        {
          // 确保在直接访问路由时能够获取到数据
          server: true,
          immediate: true,
          default: () => []
        }
      )
      
      if (data.value && data.value.length > 0) {
        posts.value = data.value.map(post => {
          const normalizedPost = normalizePost(post)
          if (!normalizedPost.date) {
            normalizedPost.date = new Date().toISOString()
          }
          return normalizedPost
        })
        console.log('Fetched posts:', posts.value)
      } else {
        console.warn('No posts found or empty data array')
        posts.value = []
      }
      return posts.value
    } catch (error) {
      console.error('Error fetching posts:', error)
      error.value = error instanceof Error ? error : new Error('Failed to fetch posts')
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 获取所有分类及其文章数量
  const getCategories = async () => {
    const allPosts = await getPosts()
    const categoryCount = allPosts.reduce((acc: Record<string, number>, post) => {
      const category = post.categories || DEFAULT_CATEGORY
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  // 获取所有标签及其文章数量
  const getTags = async () => {
    const allPosts = await getPosts()
    const tagCount = allPosts.reduce((acc: Record<string, number>, post) => {
      const tags = post.tags || []
      tags.forEach((tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {})
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  // 刷新数据的方法，用于直接访问路由时
  const refreshPosts = () => {
    return getPosts(true)
  }

  return {
    normalizePost,
    getPosts,
    refreshPosts,
    getCategories,
    getTags,
    DEFAULT_CATEGORY,
    posts,
    isLoading,
    error
  }
}