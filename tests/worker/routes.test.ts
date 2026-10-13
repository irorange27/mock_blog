import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../../worker/index'
import type { AssetFetcher, DurableObjectNamespace, Env } from '../../worker/types'

/**
 * Worker 路由层测试：只验证「请求怎么被派发」，不重复测存储语义
 * （那部分在 tests/worker/comments.test.ts）。
 */

interface Recorded {
  url: string
  method: string
  body: string
  headers: Headers
}

function createEnv(options: { postExists?: boolean; token?: string } = {}) {
  const calls: Recorded[] = []

  const assets: AssetFetcher = {
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/posts/')) {
        return new Response(null, { status: options.postExists === false ? 404 : 200 })
      }
      // 只有 GET/HEAD 才回正文，避免 HEAD 探测被 404 分支吞掉
      const body = request.method === 'HEAD' ? null : 'asset'
      return new Response(body, { status: 200 })
    },
  }

  const stub = {
    async fetch(request: Request | string) {
      const req = typeof request === 'string' ? new Request(request) : request
      calls.push({
        url: req.url,
        method: req.method,
        body: await req.text().catch(() => ''),
        headers: req.headers,
      })
      return Response.json({ ok: true })
    },
  }

  const namespace: DurableObjectNamespace = {
    idFromName: (name: string) => ({ toString: () => name }),
    get: () => stub,
  }

  const env: Env = {
    ASSETS: assets,
    COMMENTS: namespace,
    COMMENT_ADMIN_TOKEN: options.token,
  }

  return { env, calls }
}

const run = (env: Env, path: string, init: RequestInit = {}) =>
  worker.fetch(new Request(`https://blog.local${path}`, init), env)

let ctx: ReturnType<typeof createEnv>

beforeEach(() => {
  ctx = createEnv()
})

describe('Worker 路由 — 评论', () => {
  it('GET 读取时先确认文章存在，再转发给 DO', async () => {
    const res = await run(ctx.env, '/api/comments/hello-world')

    expect(res.status).toBe(200)
    expect(ctx.calls).toHaveLength(1)
    expect(ctx.calls[0]!.url).toBe('https://comments/list?slug=hello-world')
  })

  it('文章不存在时返回 404，且不碰 DO', async () => {
    const { env, calls } = createEnv({ postExists: false })
    const res = await run(env, '/api/comments/no-such-post')

    expect(res.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  it('非法 slug 直接 400', async () => {
    const res = await run(ctx.env, '/api/comments/..%2Fetc')
    expect(res.status).toBe(400)
  })

  it('中文 slug 会先解码再校验文章存在', async () => {
    const res = await run(ctx.env, `/api/comments/${encodeURIComponent('技术/你好')}`)
    expect(res.status).toBe(200)
    expect(ctx.calls[0]!.url).toBe(`https://comments/list?slug=${encodeURIComponent('技术/你好')}`)
  })

  it('POST 把 CF-Connecting-IP 改名成 x-comment-ip 转发', async () => {
    const res = await run(ctx.env, '/api/comments/hello-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: JSON.stringify({ nick: 'x', body: 'y' }),
    })

    expect(res.status).toBe(200)
    expect(ctx.calls[0]!.headers.get('x-comment-ip')).toBe('1.2.3.4')
  })

  it('客户端自带的 x-comment-ip 不会被透传（防伪造）', async () => {
    await run(ctx.env, '/api/comments/hello-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-comment-ip': '9.9.9.9' },
      body: JSON.stringify({ nick: 'x', body: 'y' }),
    })

    expect(ctx.calls[0]!.headers.get('x-comment-ip')).toBeNull()
  })

  it('超大请求体返回 413，不转发', async () => {
    const res = await run(ctx.env, '/api/comments/hello-world', {
      method: 'POST',
      body: 'x'.repeat(9 * 1024),
    })

    expect(res.status).toBe(413)
    expect(ctx.calls).toHaveLength(0)
  })

  it('不支持的动词返回 405 并给出 Allow', async () => {
    const res = await run(ctx.env, '/api/comments/hello-world', { method: 'PUT' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toContain('GET')
  })
})

describe('Worker 路由 — 删除', () => {
  it('未配置令牌时删除接口整体关闭', async () => {
    const res = await run(ctx.env, '/api/comments/c1', {
      method: 'DELETE',
      headers: { 'x-comment-token': 'anything' },
    })

    expect(res.status).toBe(501)
    expect(ctx.calls).toHaveLength(0)
  })

  it('令牌错误返回 403', async () => {
    const { env, calls } = createEnv({ token: 'secret' })
    const res = await run(env, '/api/comments/c1', {
      method: 'DELETE',
      headers: { 'x-comment-token': 'wrong' },
    })

    expect(res.status).toBe(403)
    expect(calls).toHaveLength(0)
  })

  it('令牌正确时转发删除（不校验文章存在，删的是评论 id）', async () => {
    const { env, calls } = createEnv({ token: 'secret', postExists: false })
    const res = await run(env, '/api/comments/c1', {
      method: 'DELETE',
      headers: { 'x-comment-token': 'secret' },
    })

    expect(res.status).toBe(200)
    expect(calls[0]!.url).toBe('https://comments/delete')
    expect(calls[0]!.body).toBe(JSON.stringify({ id: 'c1' }))
  })
})

describe('Worker 路由 — 已下线的接口', () => {
  // 阅读量功能整体移除（上报一直 400、线上从未生效），接口直接 404，
  // 不要再打到任何 Durable Object 上。
  it('/api/views/* 返回 404 且不触发 DO', async () => {
    const res = await run(ctx.env, '/api/views/hello-world')
    expect(res.status).toBe(404)
    expect(ctx.calls).toHaveLength(0)
  })

  it('静态资产路径不被评论路由截胡', async () => {
    // 用 /about 断言「透传的是静态资产响应」：/posts/* 在 mock 里要同时充当
    // 文章存在性探针（HEAD+空 body），不适合再复用成正文断言。
    const res = await run(ctx.env, '/about')

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('asset')
    expect(ctx.calls).toHaveLength(0)
  })
})
