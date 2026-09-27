import { queryCollection } from '@nuxt/content/server'

const BASE_URL = 'https://blog.niina.fun'

export default defineEventHandler(async (event) => {
  const docs = await queryCollection(event, 'posts')
    .select('path', 'categories', 'tags')
    .order('date', 'DESC')
    .all()

  const staticRoutes = ['/', '/about', '/archives', '/categories', '/links', '/posts']

  const postRoutes = docs.map(doc => `${BASE_URL}${doc.path}`)

  const categoryRoutes = [...new Set(
    docs
      .filter(doc => doc?.categories)
      .map(doc => `${BASE_URL}/categories/${doc.categories}`)
  )]

  const tagRoutes = [...new Set(
    docs
      .filter(doc => doc?.tags?.length)
      .flatMap(doc => (doc.tags as string[]).map(tag => `${BASE_URL}/tags/${tag}`))
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
