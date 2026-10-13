import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useComments } from '~/composables/useComments'
import type { CommentData } from '~/types/comment'

const SLUG = 'hello-world'

const comment = (over: Partial<CommentData> = {}): CommentData => ({
  id: 'c1',
  slug: SLUG,
  nick: 'Niina',
  link: '',
  body: '写得好',
  parent: '',
  created: 1_700_000_000_000,
  ...over,
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

let fetchMock: ReturnType<typeof vi.fn>
let storage: Map<string, string>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  // nuxt 测试环境里 window 有、localStorage 没有（Node 未开 --localstorage-file），
  // 这里补一个最小实现，用来验证身份记忆的读写。
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** 等 composable 里 immediate watcher 触发的首个请求落地 */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('useComments — 读取', () => {
  it('拉取当前文章的评论并计数', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ comments: [comment(), comment({ id: 'c2' })] }))

    const { comments, count } = useComments(() => SLUG)
    await flush()

    expect(fetchMock).toHaveBeenCalledWith(`/api/comments/${SLUG}`)
    expect(count.value).toBe(2)
    expect(comments.value[0]!.nick).toBe('Niina')
  })

  // 读取失败不抛错、也不给读者看任何提示：列表就是空的，等下次刷新再试。
  // 界面上没有「读不到评论」这种状态，所以这里只断言「不炸」。
  it('接口不可用时不抛错，列表保持为空', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    const { comments } = useComments(() => SLUG)
    await flush()

    expect(comments.value).toEqual([])
  })

  it('404（文章不存在）同样安静降级', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'post not found' }, 404))

    const { comments } = useComments(() => SLUG)
    await flush()

    expect(comments.value).toEqual([])
  })

  it('过滤掉形状不对的条目', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ comments: [comment(), { id: 42 }] }))

    const { comments } = useComments(() => SLUG)
    await flush()

    expect(comments.value).toHaveLength(1)
  })

  it('空 slug 不发请求', async () => {
    const { comments } = useComments(() => '')
    await flush()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(comments.value).toEqual([])
  })
})

describe('useComments — 回复树', () => {
  it('把回复挂在它的主楼下面', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      comments: [
        comment({ id: 'root' }),
        comment({ id: 'reply', parent: 'root' }),
      ],
    }))

    const { tree } = useComments(() => SLUG)
    await flush()

    expect(tree.value).toHaveLength(1)
    expect(tree.value[0]!.id).toBe('root')
    expect(tree.value[0]!.children.map(c => c.id)).toEqual(['reply'])
  })

  it('回复的回复会上溯到同一条主楼，不会生成第三层', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      comments: [
        comment({ id: 'root' }),
        comment({ id: 'reply', parent: 'root' }),
        comment({ id: 'reply2', parent: 'reply' }),
      ],
    }))

    const { tree } = useComments(() => SLUG)
    await flush()

    expect(tree.value).toHaveLength(1)
    expect(tree.value[0]!.children.map(c => c.id)).toEqual(['reply', 'reply2'])
  })

  it('parent 指向不存在的评论时按主楼展示，不丢内容', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      comments: [comment({ id: 'orphan', parent: 'gone' })],
    }))

    const { tree } = useComments(() => SLUG)
    await flush()

    expect(tree.value).toHaveLength(1)
    expect(tree.value[0]!.id).toBe('orphan')
  })
})

describe('useComments — 发表', () => {
  it('成功后把新评论追加到列表', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [] }))
      .mockResolvedValueOnce(jsonResponse({ comment: comment({ id: 'new' }) }, 201))

    const { comments, submit } = useComments(() => SLUG)
    await flush()

    const failure = await submit('第一条评论')

    expect(failure).toBeNull()
    expect(comments.value.map(c => c.id)).toEqual(['new'])
  })

  it('服务端返回的错误文案原样带回给表单', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [] }))
      .mockResolvedValueOnce(jsonResponse({ error: '昵称不能为空' }, 400))

    const { submit } = useComments(() => SLUG)
    await flush()

    expect(await submit('x')).toBe('昵称不能为空')
  })

  it('限流（429）时把提示交给表单', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [] }))
      .mockResolvedValueOnce(jsonResponse({ error: 'too many comments, try again later' }, 429))

    const { submit } = useComments(() => SLUG)
    await flush()

    expect(await submit('刷屏')).toContain('too many')
  })

  it('网络异常时返回可展示的文案', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [] }))
      .mockRejectedValueOnce(new Error('offline'))

    const { submit } = useComments(() => SLUG)
    await flush()

    expect(await submit('试试')).toBe('网络异常，评论未发送')
  })

  it('发表时带上回复目标与本地身份', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [comment({ id: 'root' })] }))
      .mockResolvedValueOnce(jsonResponse({ comment: comment({ id: 'r', parent: 'root' }) }, 201))

    const { identity, submit } = useComments(() => SLUG)
    await flush()

    identity.nick = '访客'
    identity.email = 'a@b.com'
    await submit('回复内容', 'root')

    const [, init] = fetchMock.mock.calls[1]!
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject({
      slug: SLUG,
      nick: '访客',
      email: 'a@b.com',
      parent: 'root',
    })
  })

  it('成功后把身份写进 localStorage', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [] }))
      .mockResolvedValueOnce(jsonResponse({ comment: comment() }, 201))

    const { identity, submit } = useComments(() => SLUG)
    await flush()

    identity.nick = '访客'
    identity.email = 'a@b.com'
    await submit('内容')

    expect(JSON.parse(storage.get('comment-identity')!)).toMatchObject({
      nick: '访客',
      email: 'a@b.com',
    })
  })
})

describe('useComments — 删除', () => {
  it('用 DELETE 带上令牌，成功后本地移除该条与其回复', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        comments: [comment({ id: 'root' }), comment({ id: 'reply', parent: 'root' })],
      }))
      .mockResolvedValueOnce(jsonResponse({ deleted: true }))

    const { comments, remove } = useComments(() => SLUG)
    await flush()

    const failure = await remove('root', 'secret')

    expect(failure).toBeNull()
    expect(comments.value).toEqual([])

    const [, init] = fetchMock.mock.calls[1]!
    expect(init.method).toBe('DELETE')
    expect(init.headers).toMatchObject({ 'x-comment-token': 'secret' })
  })

  it('令牌错误时返回文案且不移除本地数据', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ comments: [comment({ id: 'root' })] }))
      .mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403))

    const { comments, remove } = useComments(() => SLUG)
    await flush()

    expect(await remove('root', 'wrong')).toBe('forbidden')
    expect(comments.value).toHaveLength(1)
  })
})
