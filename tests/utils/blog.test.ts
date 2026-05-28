import { describe, it, expect } from 'vitest'
import { 
  formatDate, 
  formatDay, 
  groupPostsByYearAndMonth,
  getCategoryStats,
  getTagStats,
  paginatePosts,
  getTotalPages,
  generateExcerpt
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

  describe('getCategoryStats', () => {
    it('should count categories correctly', () => {
      const result = getCategoryStats(mockPosts)
      
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('技术')
      expect(result[0].count).toBe(2)
      expect(result[1].name).toBe('生活')
      expect(result[1].count).toBe(1)
    })
  })

  describe('getTagStats', () => {
    it('should count tags correctly', () => {
      const result = getTagStats(mockPosts)
      
      expect(result.find(tag => tag.name === 'vue')?.count).toBe(2)
      expect(result.find(tag => tag.name === 'nuxt')?.count).toBe(1)
      expect(result.find(tag => tag.name === 'typescript')?.count).toBe(1)
      expect(result.find(tag => tag.name === 'daily')?.count).toBe(1)
    })
  })

  describe('paginatePosts', () => {
    it('should paginate correctly', () => {
      const page1 = paginatePosts(mockPosts, 1, 2)
      expect(page1).toHaveLength(2)
      expect(page1[0].title).toBe('Test Post 1')
      expect(page1[1].title).toBe('Test Post 2')

      const page2 = paginatePosts(mockPosts, 2, 2)
      expect(page2).toHaveLength(1)
      expect(page2[0].title).toBe('Test Post 3')
    })
  })

  describe('getTotalPages', () => {
    it('should calculate total pages', () => {
      expect(getTotalPages(10, 3)).toBe(4)
      expect(getTotalPages(9, 3)).toBe(3)
      expect(getTotalPages(1, 3)).toBe(1)
      expect(getTotalPages(0, 3)).toBe(0)
    })
  })

  describe('generateExcerpt', () => {
    it('should generate clean excerpt', () => {
      const content = '# Title\n\nThis is a **test** content with `code` and [link](http://example.com).'
      const result = generateExcerpt(content, 50)
      
      expect(result).not.toContain('#')
      expect(result).not.toContain('**')
      expect(result).not.toContain('`')
      expect(result).not.toContain('[link]')
      expect(result).toContain('This is a test content')
    })

    it('should handle empty content', () => {
      const result = generateExcerpt('')
      expect(result).toBe('')
    })
  })
})
