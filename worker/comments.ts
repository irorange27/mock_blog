import type { DurableObjectState } from './types'

// 全站评论共用一个 Durable Object：评论要跨文章查询（比如后台按时间倒序列出），
// 分片到每篇文章反而要再做一层聚合。单实例串行写入对本站量级完全够用。
//
// 身份沿用访客自填的「昵称 + 邮箱 + 网址」，不做服务端会话——即任何人都可以
// 冒充昵称。这是刻意接受的取舍，防线只有 IP 限流 + 博主手动删除，详见 docs/comments.md。

const NAME_MAX = 24
const EMAIL_MAX = 254
const LINK_MAX = 200
const BODY_MAX = 1000
const THREAD_MAX = 200

// 同一 IP 10 分钟内最多 5 条，与 Twikoo 的默认口径一致。
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 5

export interface CommentInput {
  slug: string
  nick: string
  email: string
  link: string
  body: string
  /** 回复目标评论 id；顶层评论为空串 */
  parent: string
}

interface CommentRow {
  id: string
  slug: string
  nick: string
  email: string
  link: string
  body: string
  parent: string
  created: number
}

/** 返回给前端的评论：不含 email（只有博主自己看得到），带邮箱哈希以外的派生字段 */
export interface PublicComment {
  id: string
  slug: string
  nick: string
  link: string
  body: string
  parent: string
  created: number
}

export interface CommentError {
  error: string
  status: number
}

export class CommentStore {
  private readonly sql: DurableObjectState['storage']['sql']

  constructor(state: DurableObjectState) {
    this.sql = state.storage.sql
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        nick TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        link TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        parent TEXT NOT NULL DEFAULT '',
        ip TEXT NOT NULL DEFAULT '',
        created INTEGER NOT NULL
      )
    `)
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_slug_created ON comments (slug, created)')
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS comment_rate (
        ip TEXT PRIMARY KEY,
        hits INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL
      )
    `)
  }

  // DO 内请求串行执行，因此「读限流 → 校验 → 写入 → 记限流」之间没有竞态，
  // 不需要事务或乐观锁。
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    try {
      if (pathname === '/list' && request.method === 'GET') {
        return Response.json({ comments: this.list(url.searchParams.get('slug') ?? '') })
      }
      if (pathname === '/create' && request.method === 'POST') {
        return await this.create(request)
      }
      if (pathname === '/delete' && request.method === 'POST') {
        return await this.remove(request)
      }
      return json({ error: 'not found' }, 404)
    } catch {
      // 存储层异常不向前端暴露细节，只回一个可读的失败态。
      return json({ error: 'storage failure' }, 500)
    }
  }

  private list(slug: string): PublicComment[] {
    if (!slug) return []

    return this.sql
      .exec<CommentRow>(
        'SELECT id, slug, nick, link, body, parent, created FROM comments WHERE slug = ? ORDER BY created ASC, id ASC LIMIT ?',
        slug,
        THREAD_MAX,
      )
      .toArray()
  }

  private async create(request: Request): Promise<Response> {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!payload) return json({ error: 'invalid payload' }, 400)

    const input = normalizeInput(payload)
    if (typeof input === 'string') return json({ error: input }, 400)

    const ip = request.headers.get('x-comment-ip') ?? ''
    const limited = this.hitRateLimit(ip)
    if (limited) return json({ error: 'too many comments, try again later' }, 429)

    // 回复目标必须真实存在，否则会留下挂空的 parent。
    if (input.parent) {
      const parent = this.sql
        .exec<{ id: string }>('SELECT id FROM comments WHERE id = ?', input.parent)
        .toArray()
      if (parent.length === 0) return json({ error: 'parent not found' }, 400)
    }

    const comment: CommentRow = {
      id: crypto.randomUUID(),
      slug: input.slug,
      nick: input.nick,
      email: input.email,
      link: input.link,
      body: input.body,
      parent: input.parent,
      created: Date.now(),
    }

    this.sql.exec(
      'INSERT INTO comments (id, slug, nick, email, link, body, parent, ip, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      comment.id,
      comment.slug,
      comment.nick,
      comment.email,
      comment.link,
      comment.body,
      comment.parent,
      ip,
      comment.created,
    )

    return json({ comment: toPublic(comment) }, 201)
  }

  private async remove(request: Request): Promise<Response> {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const id = typeof payload?.id === 'string' ? payload.id.trim() : ''
    if (!id || id.length > 64) return json({ error: 'invalid id' }, 400)

    // 删主楼要连带删掉它的回复，否则回复会变成孤儿。
    this.sql.exec('DELETE FROM comments WHERE parent = ?', id)
    this.sql.exec('DELETE FROM comments WHERE id = ?', id)

    return json({ deleted: true })
  }

  private hitRateLimit(ip: string): boolean {
    if (!ip) return false

    const now = Date.now()
    const rows = this.sql
      .exec<{ hits: number; window_start: number }>(
        'SELECT hits, window_start FROM comment_rate WHERE ip = ?',
        ip,
      )
      .toArray()

    const current = rows[0]
    if (!current || now - current.window_start >= RATE_WINDOW_MS) {
      this.sql.exec(
        'INSERT INTO comment_rate (ip, hits, window_start) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET hits = 1, window_start = ?',
        ip,
        now,
        now,
      )
      return false
    }

    if (current.hits >= RATE_LIMIT) return true

    this.sql.exec('UPDATE comment_rate SET hits = hits + 1 WHERE ip = ?', ip)
    return false
  }
}

/** 校验并裁剪入参；返回字符串表示校验失败的原因 */
function normalizeInput(payload: Record<string, unknown>): CommentInput | string {
  const slug = str(payload.slug)
  if (!slug || slug.length > 200) return 'invalid slug'

  const nick = str(payload.nick).trim()
  if (!nick) return '昵称不能为空'
  if (nick.length > NAME_MAX) return `昵称不能超过 ${NAME_MAX} 个字符`

  // 邮箱必填。它不参与展示（接口不回传这个字段），用途是日后的邮件通知，
  // 比如有人回复了你的评论时提醒你——所以现在只做校验并入库。
  const email = str(payload.email).trim()
  if (!email) return '邮箱不能为空'
  if (email.length > EMAIL_MAX) return `邮箱不能超过 ${EMAIL_MAX} 个字符`
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确'

  const link = str(payload.link).trim()
  if (link.length > LINK_MAX) return `网址不能超过 ${LINK_MAX} 个字符`
  if (link && !/^https?:\/\/\S+$/i.test(link)) return '网址需以 http:// 或 https:// 开头'

  const body = str(payload.body).trim()
  if (!body) return '评论内容不能为空'
  if (body.length > BODY_MAX) return `评论内容不能超过 ${BODY_MAX} 个字符`

  return {
    slug,
    nick,
    email,
    link,
    body,
    parent: str(payload.parent).trim().slice(0, 64),
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toPublic(row: CommentRow): PublicComment {
  return {
    id: row.id,
    slug: row.slug,
    nick: row.nick,
    link: row.link,
    body: row.body,
    parent: row.parent,
    created: row.created,
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
