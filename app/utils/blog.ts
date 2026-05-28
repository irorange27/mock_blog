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
