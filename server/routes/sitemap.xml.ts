import { serverQueryContent } from '#content/server'

const BASE_URL = 'https://blog.niina.fun'

export default defineEventHandler(async (event) => {
  const docs = await serverQueryContent(event)
    .sort({ date: -1 })
    .where({ _partial: false })
    .find()

  const staticRoutes = ['/', '/about', '/archives', '/categories', '/links']

  const postRoutes = docs
    .filter(doc => doc?._path?.startsWith('/posts/'))
    .map(doc => `${BASE_URL}${doc._path}`)

  const categoryRoutes = [...new Set(
    docs
      .filter(doc => doc?.categories)
      .map(doc => `${BASE_URL}/categories/${doc.categories}`)
  )]

  const tagRoutes = [...new Set(
    docs
      .filter(doc => doc?.tags?.length)
      .flatMap(doc => doc.tags.map((tag: string) => `${BASE_URL}/tags/${tag}`))
  )]

  const allUrls = [
    ...staticRoutes.map(path => `${BASE_URL}${path}`),
    ...postRoutes,
    ...categoryRoutes,
    ...tagRoutes,
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`

  event.node.res.setHeader('Content-Type', 'application/xml')
  event.node.res.end(xml)
})
