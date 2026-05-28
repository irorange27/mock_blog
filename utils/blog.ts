import type { Post } from '~/types/post'

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date, locale: string = 'zh-CN'): string => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  try {
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * 获取日期的天数
 */
export const formatDay = (date: string | Date, locale: string = 'zh-CN'): string => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  try {
    return dateObj.toLocaleDateString(locale, {
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting day:', error)
    return ''
  }
}

/**
 * 按年月分组文章
 */
export const groupPostsByYearAndMonth = (posts: Post[]): Record<string, Record<string, Post[]>> => {
  const grouped: Record<string, Record<string, Post[]>> = {}
  
  posts.forEach(post => {
    if (!post.date) return
    
    const date = new Date(post.date)
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString()
    
    if (!grouped[year]) {
      grouped[year] = {}
    }
    
    if (!grouped[year][month]) {
      grouped[year][month] = []
    }
    
    grouped[year][month].push(post)
  })
  
  return grouped
}

/**
 * 获取分类统计
 */
export const getCategoryStats = (posts: Post[]): Array<{ name: string; count: number }> => {
  const categoryCount = posts.reduce((acc, post) => {
    const category = post.categories || '默认'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(categoryCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 获取标签统计
 */
export const getTagStats = (posts: Post[]): Array<{ name: string; count: number }> => {
  const tagCount = posts.reduce((acc, post) => {
    const tags = post.tags || []
    tags.forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(tagCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 文章分页
 */
export const paginatePosts = (posts: Post[], page: number, postsPerPage: number) => {
  const start = (page - 1) * postsPerPage
  const end = start + postsPerPage
  return posts.slice(start, end)
}

/**
 * 计算总页数
 */
export const getTotalPages = (totalPosts: number, postsPerPage: number): number => {
  return Math.ceil(totalPosts / postsPerPage)
}

/**
 * 生成文章摘要
 */
export const generateExcerpt = (content: string, maxLength: number = 200): string => {
  if (!content) return ''
  
  // 移除markdown标记
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // 移除代码块
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
    .replace(/\[.*?\]\(.*?\)/g, '$1') // 移除链接但保留文本
    .replace(/\n+/g, ' ') // 替换换行为空格
    .trim()
  
  if (plainText.length <= maxLength) return plainText
  
  return plainText.slice(0, maxLength) + '...'
}