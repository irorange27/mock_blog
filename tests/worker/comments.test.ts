import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommentStore } from '../../worker/comments'
import type { DurableObjectState, SqlStorage, SqlStorageCursor } from '../../worker/types'

/**
 * Durable Object 的 SQLite 替身。
 *
 * 真 DO 里 `sql.exec` 是同步游标 API；这里用 node:sqlite 承接同一套 SQL，
 * 只实现 CommentStore 用到的子集（exec + toArray）。
 */
class FakeSql implements SqlStorage {
  constructor(private readonly db: FakeDatabase) {}

  exec<T = Record<string, unknown>>(sql: string, ...args: unknown[]): SqlStorageCursor<T> {
    const rows = this.db.run(sql, args) as T[]
    return { toArray: () => rows }
  }
}

interface FakeDatabase {
  run(sql: string, args: unknown[]): unknown[]
}

/** 极简内存 SQL 替身：只覆盖评论存储用到的四类语句 */
function createDatabase(): FakeDatabase {
  const comments = new Map<string, Record<string, unknown>>()
  const rate = new Map<string, { hits: number; window_start: number }>()

  const norm = (args: unknown[]) => args.map(a => (a === undefined ? null : a))

  return {
    run(sql, args) {
      const s = sql.replace(/\s+/g, ' ').trim()
      const a = norm(args)

      if (/^CREATE TABLE|^CREATE INDEX/i.test(s)) return []

      if (/^INSERT INTO comments/i.test(s)) {
        const [id, slug, nick, email, link, body, parent, ip, created] = a
        comments.set(String(id), {
          id, slug, nick, email, link, body, parent, ip, created,
        })
        return []
      }

      if (/^SELECT id, slug, nick, link, body, parent, created FROM comments WHERE slug = \?/i.test(s)) {
        return [...comments.values()]
          .filter(c => c.slug === a[0])
          .sort((x, y) => Number(x.created) - Number(y.created) || String(x.id).localeCompare(String(y.id)))
          .slice(0, Number(a[1]))
      }

      if (/^SELECT id FROM comments WHERE id = \?/i.test(s)) {
        const row = comments.get(String(a[0]))
        return row ? [{ id: row.id }] : []
      }

      if (/^DELETE FROM comments WHERE parent = \?/i.test(s)) {
        for (const [id, c] of [...comments]) {
          if (c.parent === a[0]) comments.delete(id)
        }
        return []
      }

      if (/^DELETE FROM comments WHERE id = \?/i.test(s)) {
        comments.delete(String(a[0]))
        return []
      }

      if (/^SELECT hits, window_start FROM comment_rate WHERE ip = \?/i.test(s)) {
        const row = rate.get(String(a[0]))
        return row ? [{ hits: row.hits, window_start: row.window_start }] : []
      }

      if (/^INSERT INTO comment_rate/i.test(s)) {
        // (ip, hits, window_start) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET hits = 1, window_start = ?
        rate.set(String(a[0]), { hits: 1, window_start: Number(a[2] ?? a[1]) })
        return []
      }

      if (/^UPDATE comment_rate SET hits = hits \+ 1/i.test(s)) {
        const row = rate.get(String(a[0]))
        if (row) row.hits += 1
        return []
      }

      throw new Error(`unhandled SQL: ${s}`)
    },
  }
}

const state = (): DurableObjectState => {
  const sql = new FakeSql(createDatabase())
  return { storage: { sql } }
}

const post = (
  store: CommentStore,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) =>
  store.fetch(new Request('https://comments/create', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }))

const list = (store: CommentStore, slug: string) =>
  store.fetch(new Request(`https://comments/list?slug=${encodeURIComponent(slug)}`))

/** 用假时钟固定 created，便于断言严格的时间升序（真实现里 created 取 Date.now） */
const postWithCreated = async (
  store: CommentStore,
  body: Record<string, unknown>,
  createdAt: number,
) => {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(createdAt)
  try {
    const res = await post(store, body)
    const payload = await res.json() as { comment: { id: string } }
    return payload.comment.id
  } finally {
    spy.mockRestore()
  }
}

const valid = {
  slug: 'hello-world',
  nick: 'Niina',
  email: 'a@b.com',
  link: 'https://example.com',
  body: '写得好',
  parent: '',
}

let store: CommentStore

beforeEach(() => {
  store = new CommentStore(state())
})

describe('CommentStore — 发表', () => {
  it('写入后能读回，且不回传邮箱', async () => {
    const created = await post(store, valid)
    expect(created.status).toBe(201)

    const payload = await created.json() as { comment: Record<string, unknown> }
    expect(payload.comment.nick).toBe('Niina')
    expect(payload.comment.email).toBeUndefined()
    expect(payload.comment.id).toBeTypeOf('string')

    const listed = await (await list(store, 'hello-world')).json() as { comments: unknown[] }
    expect(listed.comments).toHaveLength(1)
  })

  it('拒绝空昵称、空邮箱、空正文、错误邮箱与非法网址', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...valid, nick: '   ' }, '昵称不能为空'],
      // 邮箱必填：留空与格式错误是两条不同的提示，分别对应「没填」和「填错」
      [{ ...valid, email: '' }, '邮箱不能为空'],
      [{ ...valid, email: '   ' }, '邮箱不能为空'],
      [{ ...valid, email: 'not-an-email' }, '邮箱格式不正确'],
      [{ ...valid, body: '  ' }, '评论内容不能为空'],
      [{ ...valid, link: 'example.com' }, '网址需以 http:// 或 https:// 开头'],
    ]

    for (const [payload, message] of cases) {
      const res = await post(store, payload)
      expect(res.status).toBe(400)
      expect((await res.json() as { error: string }).error).toBe(message)
    }
  })

  it('昵称、邮箱与正文超长被拒绝', async () => {
    expect((await post(store, { ...valid, nick: 'a'.repeat(25) })).status).toBe(400)
    expect((await post(store, { ...valid, email: `${'a'.repeat(250)}@b.com` })).status).toBe(400)
    expect((await post(store, { ...valid, body: 'a'.repeat(1001) })).status).toBe(400)
  })

  it('拒绝不存在的回复目标', async () => {
    const res = await post(store, { ...valid, parent: 'no-such-id' })
    expect(res.status).toBe(400)
    expect((await res.json() as { error: string }).error).toBe('parent not found')
  })

  it('读取只返回当前文章的评论，且按时间升序', async () => {
    const first = await (await post(store, valid)).json() as { comment: { id: string; created: number } }
    const second = await (await post(store, { ...valid, body: '第二条' })).json() as {
      comment: { id: string; created: number }
    }
    await post(store, { ...valid, slug: 'another-post' })

    // 同一毫秒内两次写入时 created 相同，排序回落到 id —— 这里断言集合而不是顺序
    const listed = await (await list(store, 'hello-world')).json() as {
      comments: Array<{ id: string; body: string }>
    }
    expect(listed.comments.map(c => c.id).sort()).toEqual([first.comment.id, second.comment.id].sort())
    expect(listed.comments.map(c => c.body).sort()).toEqual(['写得好', '第二条'].sort())
  })

  it('不同时间戳的评论严格按时间升序', async () => {
    // 直接构造固定 created，避免同毫秒并列导致断言不稳定
    const older = await postWithCreated(store, { ...valid, body: '早' }, 1_000)
    const newer = await postWithCreated(store, { ...valid, body: '晚' }, 2_000)

    const listed = await (await list(store, 'hello-world')).json() as {
      comments: Array<{ id: string; body: string }>
    }
    expect(listed.comments.map(c => c.body)).toEqual(['早', '晚'])
    expect(listed.comments.map(c => c.id)).toEqual([older, newer])
  })

  it('空 slug 的读取返回空列表', async () => {
    await post(store, valid)
    const listed = await (await list(store, '')).json() as { comments: unknown[] }
    expect(listed.comments).toEqual([])
  })
})

describe('CommentStore — 限流', () => {
  it('同一 IP 第 6 条开始返回 429', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await post(store, valid, { 'x-comment-ip': '1.2.3.4' })
      expect(res.status).toBe(201)
    }

    const blocked = await post(store, valid, { 'x-comment-ip': '1.2.3.4' })
    expect(blocked.status).toBe(429)
  })

  it('不同 IP 各自计数', async () => {
    for (let i = 0; i < 5; i++) await post(store, valid, { 'x-comment-ip': '1.2.3.4' })

    const other = await post(store, valid, { 'x-comment-ip': '5.6.7.8' })
    expect(other.status).toBe(201)
  })

  it('没有 IP 头时不限流（本地 wrangler dev 场景）', async () => {
    for (let i = 0; i < 8; i++) {
      expect((await post(store, valid)).status).toBe(201)
    }
  })
})

describe('CommentStore — 删除', () => {
  it('删主楼连带删掉回复', async () => {
    const parent = await (await post(store, valid)).json() as { comment: { id: string } }
    await post(store, { ...valid, parent: parent.comment.id })

    const removed = await store.fetch(new Request('https://comments/delete', {
      method: 'POST',
      body: JSON.stringify({ id: parent.comment.id }),
    }))
    expect(removed.status).toBe(200)

    const listed = await (await list(store, 'hello-world')).json() as { comments: unknown[] }
    expect(listed.comments).toEqual([])
  })

  it('缺 id 时返回 400', async () => {
    const res = await store.fetch(new Request('https://comments/delete', {
      method: 'POST',
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })
})

describe('CommentStore — 路由', () => {
  it('未知路径返回 404', async () => {
    const res = await store.fetch(new Request('https://comments/nope'))
    expect(res.status).toBe(404)
  })

  it('list 只接受 GET', async () => {
    const res = await store.fetch(new Request('https://comments/list', { method: 'POST' }))
    expect(res.status).toBe(404)
  })
})
