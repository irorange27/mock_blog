import { ref } from 'vue'
import type { Post } from '../types/post'

export const usePostData = () => {
  const DEFAULT_CATEGORY = '默认'
  const posts = ref<Post[]>([])

  // 处理文章数据，确保每篇文章都有分类和标签
  const normalizePost = (post: Post): Post => {
    const normalized: Post = {
      ...post,
      categories: post.categories || DEFAULT_CATEGORY,
      tags: Array.isArray(post.tags) ? post.tags : [],
      date: post.date || new Date().toISOString()
    }
    console.log('Normalized post:', normalized)
    return normalized
  }

  // 获取所有文章
  const getPosts = async () => {
    try {
      console.log('Fetching posts...')
      const { data } = await useAsyncData('posts-list', () => 
        queryContent('posts')
        .sort({ date: -1 })
        .find()
      )
      if (data.value) {
        posts.value = data.value.map(post => {
          const normalizedPost = normalizePost(post)
          if (!normalizedPost.date) {
            normalizedPost.date = new Date().toISOString()
          }
          return normalizedPost
        })
        console.log('Fetched posts:', posts.value)
      } else {
        console.warn('No posts found')
        posts.value = []
      }
      return posts.value
    } catch (error) {
      console.error('Error fetching posts:', error)
      return []
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

  return {
    normalizePost,
    getPosts,
    getCategories,
    getTags,
    DEFAULT_CATEGORY,
    posts // 公开 posts 以便在其他组件中使用
  }
}