import type { Env } from './types'

export { ViewCounter } from './views'
export { CommentStore } from './comments'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname.startsWith('/api/comments')) {
      return handleComments(request, env, pathname)
    }
    if (pathname.startsWith('/api/')) {
      return handleApi(request, env, pathname)
    }
    // 其余请求交给静态资产；未命中时按 not_found_handling 返回 404 页
    return env.ASSETS.fetch(request)
  },
}

async function handleApi(request: Request, env: Env, pathname: string): Promise<Response> {
  const prefix = '/api/views/'
  if (!pathname.startsWith(prefix)) {
    return apiJson({ error: 'not found' }, 404)
  }

  const encodedSlug = pathname.slice(prefix.length)
  if (!encodedSlug) {
    return apiJson({ error: 'not found' }, 404)
  }

  let slug: string
  try {
    slug = decodeURIComponent(encodedSlug)
  } catch {
    return apiJson({ error: 'invalid slug' }, 400)
  }
  if (!isValidSlug(slug)) {
    return apiJson({ error: 'invalid slug' }, 400)
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return apiJson(
      { error: 'method not allowed' },
      405,
      { Allow: 'GET, POST' },
    )
  }

  // 用静态产物确认文章存在，避免任意 slug 建立 Durable Object 或污染计数数据。
  const postPath = slug.split('/').map(encodeURIComponent).join('/')
  const post = await env.ASSETS.fetch(
    new Request(`https://assets.local/posts/${postPath}/`, { method: 'HEAD' }),
  )
  if (!post.ok) {
    return apiJson({ error: 'post not found' }, 404)
  }

  // 文章是自然分区：每篇文章有独立 DO，不把全站请求串行到一个全局实例。
  const action = request.method === 'POST' ? 'increment' : 'count'
  const stub = env.VIEWS.get(env.VIEWS.idFromName(`post:${slug}`))
  return stub.fetch(new Request(`https://view-counter/${action}`, { method: request.method }))
}

function apiJson(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  return Response.json(body, { status, headers: responseHeaders })
}

// 评论 API：GET /api/comments/<slug>、POST /api/comments/<slug>、DELETE /api/comments/<id>。
// 与阅读量不同，删除需要博主令牌，见 handleComments。
async function handleComments(request: Request, env: Env, pathname: string): Promise<Response> {
  const rest = pathname.slice('/api/comments'.length).replace(/^\/+/, '')
  if (!rest) return apiJson({ error: 'not found' }, 404)

  let decoded: string
  try {
    decoded = decodeURIComponent(rest)
  } catch {
    return apiJson({ error: 'invalid slug' }, 400)
  }

  const stub = env.COMMENTS.get(env.COMMENTS.idFromName('comments'))

  // 删除走单独的动词，避免把 id 与 slug 混在同一个路径参数里。
  if (request.method === 'DELETE') {
    if (!env.COMMENT_ADMIN_TOKEN) {
      return apiJson({ error: 'delete disabled' }, 501)
    }
    if (!timingSafeEqual(request.headers.get('x-comment-token') ?? '', env.COMMENT_ADMIN_TOKEN)) {
      return apiJson({ error: 'forbidden' }, 403)
    }
    return stub.fetch(
      new Request('https://comments/delete', {
        method: 'POST',
        body: JSON.stringify({ id: decoded }),
      }),
    )
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return apiJson({ error: 'method not allowed' }, 405, { Allow: 'GET, POST, DELETE' })
  }
  if (!isValidSlug(decoded)) {
    return apiJson({ error: 'invalid slug' }, 400)
  }

  // 用静态产物确认文章存在，与阅读量同一套做法：拒绝为不存在的 slug 建立数据。
  const postPath = decoded.split('/').map(encodeURIComponent).join('/')
  const post = await env.ASSETS.fetch(
    new Request(`https://assets.local/posts/${postPath}/`, { method: 'HEAD' }),
  )
  if (!post.ok) {
    return apiJson({ error: 'post not found' }, 404)
  }

  if (request.method === 'GET') {
    return stub.fetch(new Request(`https://comments/list?slug=${encodeURIComponent(decoded)}`))
  }

  const body = await request.text()
  if (body.length > 8 * 1024) {
    return apiJson({ error: 'payload too large' }, 413)
  }

  // 限流与审计用的 IP：Cloudflare 注入的 CF-Connecting-IP 不可伪造，
  // 转发时改名成 x-comment-ip，避免 DO 侧直接信任任意请求头。
  // 用普通对象而不是 Headers 实例：测试环境（happy-dom）下 Headers 会被平台实现
  // 覆盖，作为 Request init 传入时非 Content-Type 的头会被悄悄丢掉。
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) headers['x-comment-ip'] = ip

  return stub.fetch(
    new Request('https://comments/create', { method: 'POST', headers, body }),
  )
}

// 常数时间比较，避免用响应时间逐字符猜出令牌。
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// slug 即 content/posts 的文件名去后缀：允许目录层级，但不允许空段、点路径、反斜杠或控制字符。
function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 200) return false

  return slug.split('/').every((segment) =>
    segment.length > 0
    && segment !== '.'
    && segment !== '..'
    && !segment.includes('\\')
    && !/[\u0000-\u001f\u007f]/.test(segment),
  )
}
