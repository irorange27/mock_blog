import { describe, it, expect } from 'vitest'
import { 
  formatDate, 
  formatDay, 
  groupPostsByYearAndMonth,
  normalizeSlug,
} from '~/utils/blog'

describe('博客工具函数', () => {
  const mockPosts = [
    {
      path: '/posts/test-1',
      title: 'Test Post 1',
      date: '2024-01-15T00:00:00.000Z',
      categories: '技术',
      tags: ['vue', 'nuxt'],
      description: 'Test description 1'
    },
    {
      path: '/posts/test-2',
      title: 'Test Post 2',
      date: '2024-01-20T00:00:00.000Z',
      categories: '生活',
      tags: ['daily'],
      description: 'Test description 2'
    },
    {
      path: '/posts/test-3',
      title: 'Test Post 3',
      date: '2024-02-10T00:00:00.000Z',
      categories: '技术',
      tags: ['vue', 'typescript'],
      description: 'Test description 3'
    }
  ]

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-01-15T00:00:00.000Z')
      expect(result).toContain('2024')
      expect(result).toContain('1月')
      expect(result).toContain('15')
    })

    it('should handle empty date', () => {
      const result = formatDate('')
      expect(result).toBe('')
    })
  })

  describe('formatDay', () => {
    it('should extract day number', () => {
      const result = formatDay('2024-01-15T00:00:00.000Z')
      expect(result).toContain('15')
    })
  })

  describe('groupPostsByYearAndMonth', () => {
    it('should group posts by year and month in descending order', () => {
      const result = groupPostsByYearAndMonth(mockPosts)

      expect(result).toHaveLength(1)
      expect(result[0].year).toBe('2024')
      expect(result[0].months.map(m => m.month)).toEqual(['2', '1'])
      expect(result[0].months[0].posts).toHaveLength(1)
      expect(result[0].months[1].posts).toHaveLength(2)
      // 月内按日期倒序：2024-01-20 的文章排在 2024-01-15 之前
      expect(result[0].months[1].posts[0].path).toBe('/posts/test-2')
      expect(result[0].months[1].posts[1].path).toBe('/posts/test-1')
    })
  })
})

describe('normalizeSlug', () => {
  // 这条规则修的是一个真实 bug：route.params.slug 带收尾斜杠时，
  // 评论会打到 /api/.../foo%2F 上被 Worker 判 400。
  it('去掉收尾斜杠', () => {
    expect(normalizeSlug('2024summary/')).toBe('2024summary')
    expect(normalizeSlug('2024summary//')).toBe('2024summary')
  })

  it('不带斜杠时原样返回', () => {
    expect(normalizeSlug('2024summary')).toBe('2024summary')
  })

  it('保留多段路径中的斜杠', () => {
    expect(normalizeSlug('2024/notes/foo')).toBe('2024/notes/foo')
    expect(normalizeSlug('2024/notes/foo/')).toBe('2024/notes/foo')
  })

  it('catch-all 参数是数组时先拼起来', () => {
    expect(normalizeSlug(['2024', 'notes'])).toBe('2024/notes')
    // 数组尾元素为空 → join 出收尾斜杠 → 归一后仍应干净
    expect(normalizeSlug(['2024', 'notes', ''])).toBe('2024/notes')
  })

  it('空值返回空串', () => {
    expect(normalizeSlug(undefined)).toBe('')
    expect(normalizeSlug(null)).toBe('')
    expect(normalizeSlug('')).toBe('')
  })
})
