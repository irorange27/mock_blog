import type { Env } from './types'

export { ViewCounter } from './views'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

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
