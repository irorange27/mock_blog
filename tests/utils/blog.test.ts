import { describe, it, expect } from 'vitest'
import { 
  formatDate, 
  formatDay, 
  groupPostsByYearAndMonth,
} from '~/utils/blog'

describe('博客工具函数', () => {
  const mockPosts = [
    {
      _path: '/posts/test-1',
      title: 'Test Post 1',
      date: '2024-01-15T00:00:00.000Z',
      categories: '技术',
      tags: ['vue', 'nuxt'],
      description: 'Test description 1'
    },
    {
      _path: '/posts/test-2',
      title: 'Test Post 2',
      date: '2024-01-20T00:00:00.000Z',
      categories: '生活',
      tags: ['daily'],
      description: 'Test description 2'
    },
    {
      _path: '/posts/test-3',
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
    it('should group posts by year and month', () => {
      const result = groupPostsByYearAndMonth(mockPosts)
      
      expect(result['2024']).toBeDefined()
      expect(result['2024']['1']).toBeDefined()
      expect(result['2024']['2']).toBeDefined()
      expect(result['2024']['1']).toHaveLength(2)
      expect(result['2024']['2']).toHaveLength(1)
    })
  })
})
