import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { normalizePost } from '~/utils/blog'
import { useBlogData } from '~/composables/useBlogData'

const { queryCollectionMock } = vi.hoisted(() => ({
  queryCollectionMock: vi.fn(),
}))

mockNuxtImport('queryCollection', () => queryCollectionMock)

const rawPosts = [
  {
    path: '/posts/vue-guide',
    title: 'Vue Guide',
    date: '2024-01-02T00:00:00.000Z',
    categories: '技术',
    tags: ['vue', 'nuxt'],
    description: 'guide',
    draft: false,
  },
  {
    path: '/posts/daily',
    title: 'Daily',
    date: '2024-01-01T00:00:00.000Z',
    categories: '生活',
    tags: ['vue'],
    description: 'daily',
    draft: false,
  },
  {
    path: '/posts/wip',
    title: 'WIP',
    date: '2024-01-03T00:00:00.000Z',
    categories: '技术',
    tags: [],
    description: 'wip',
    draft: true,
  },
]

const mockQueryCollection = () =>
  queryCollectionMock.mockImplementation(() => ({
    select: () => ({
      order: () => ({
        all: async () => rawPosts,
      }),
    }),
  }))

describe('normalizePost', () => {
  it('should fill defaults for missing fields', () => {
    const result = normalizePost({ path: '/test', title: 'Test' })
    expect(result.categories).toBe('默认')
    expect(result.tags).toEqual([])
    expect(result.draft).toBe(false)
  })

  it('should preserve existing fields', () => {
    const result = normalizePost(rawPosts[0])
    expect(result.categories).toBe('技术')
    expect(result.tags).toEqual(['vue', 'nuxt'])
  })

  it('should normalize non-array tags to empty array', () => {
    const result = normalizePost({ tags: 'single-tag' })
    expect(result.tags).toEqual([])
  })
})

// 直接测真实的 useBlogData composable（queryCollection 已 mock）
describe('useBlogData', () => {
  it('should filter drafts and derive categories/tags', async () => {
    mockQueryCollection()

    const { posts, categories, tags, getPostsByCategory, getPostsByTag } = useBlogData()
    // useAsyncData 的 handler 异步执行，等它 resolve
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(queryCollectionMock).toHaveBeenCalledWith('posts')
    expect(posts.value.map(p => p.path)).toEqual(['/posts/vue-guide', '/posts/daily'])

    expect(categories.value).toEqual([
      { name: '技术', count: 1 },
      { name: '生活', count: 1 },
    ])
    expect(tags.value).toEqual([
      { name: 'vue', count: 2 },
      { name: 'nuxt', count: 1 },
    ])

    expect(getPostsByCategory(() => '技术').value.map(p => p.path)).toEqual(['/posts/vue-guide'])
    expect(getPostsByTag(() => 'nuxt').value.map(p => p.path)).toEqual(['/posts/vue-guide'])
  })
})
