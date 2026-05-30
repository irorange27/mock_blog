import { describe, it, expect } from 'vitest'
import type { Post } from '~/types/post'
import { normalizePost } from '~/utils/blog'

const mockPosts = [
  {
    _path: '/posts/test-1',
    title: 'Test Post 1',
    date: '2024-01-01T00:00:00.000Z',
    categories: '测试分类',
    tags: ['test', 'mock'],
    description: 'Test description'
  },
  {
    _path: '/posts/test-2',
    title: 'Test Post 2',
    date: '2024-01-02T00:00:00.000Z',
    categories: '测试分类',
    tags: ['test'],
    description: 'Another test description'
  }
]

// Test the pure normalization logic
describe('normalizePost', () => {

  it('should fill defaults for missing fields', () => {
    const result = normalizePost({ _path: '/test', title: 'Test' })
    expect(result.categories).toBe('默认')
    expect(result.tags).toEqual([])
  })

  it('should preserve existing fields', () => {
    const result = normalizePost(mockPosts[0])
    expect(result.categories).toBe('测试分类')
    expect(result.tags).toEqual(['test', 'mock'])
  })

  it('should normalize non-array tags to empty array', () => {
    const result = normalizePost({ tags: 'single-tag' })
    expect(result.tags).toEqual([])
  })
})

// Test derived data computation logic
describe('derived data', () => {
  const posts = mockPosts as Post[]

  const deriveCategories = (posts: Post[]) => {
    const counts: Record<string, number> = {}
    for (const post of posts) {
      const cat = post.categories || '默认'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  const deriveTags = (posts: Post[]) => {
    const counts: Record<string, number> = {}
    for (const post of posts) {
      for (const tag of post.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  it('should derive categories', () => {
    const result = deriveCategories(posts)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('测试分类')
    expect(result[0].count).toBe(2)
  })

  it('should derive tags', () => {
    const result = deriveTags(posts)
    expect(result.find(t => t.name === 'test')?.count).toBe(2)
    expect(result.find(t => t.name === 'mock')?.count).toBe(1)
  })

  it('should filter by category', () => {
    const result = posts.filter(p => p.categories === '测试分类')
    expect(result).toHaveLength(2)
  })

  it('should filter by tag', () => {
    const testPosts = posts.filter(p => p.tags?.includes('test'))
    expect(testPosts).toHaveLength(2)

    const mockPostsResult = posts.filter(p => p.tags?.includes('mock'))
    expect(mockPostsResult).toHaveLength(1)
  })
})
