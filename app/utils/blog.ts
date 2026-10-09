import type { Post } from '~/types/post'
/**
 * 将原始文章数据规范化为 Post 类型
 */
export const normalizePost = (post: Record<string, unknown>): Post => ({
  path: (post.path as string) || '',
  draft: (post.draft as boolean) || false,
  categories: (post.categories as string) || '默认',
  tags: Array.isArray(post.tags) ? (post.tags as string[]) : [],
  date: (post.date as string) || new Date().toISOString(),
  title: (post.title as string) || 'Untitled',
  description: (post.description as string) || '',
  body: post.body as Post['body'],
})



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
 * 按年月分组文章，整体按时间倒序（最新在最上）。
 *
 * 不用对象做分组结果：年/月是整数型字符串键，JS 规范规定这类键
 * 恒按数值升序枚举，无法体现倒序，所以返回有序数组。
 */
export interface MonthGroup {
  month: string
  posts: Post[]
}

export interface YearGroup {
  year: string
  months: MonthGroup[]
}

export const groupPostsByYearAndMonth = (posts: Post[]): YearGroup[] => {
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

  return Object.keys(grouped)
    .sort((a, b) => Number(b) - Number(a))
    .map(year => ({
      year,
      months: Object.keys(grouped[year])
        .sort((a, b) => Number(b) - Number(a))
        .map(month => ({
          month,
          posts: grouped[year][month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        })),
    }))
}
