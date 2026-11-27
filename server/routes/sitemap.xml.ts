import { queryCollection } from '@nuxt/content/server'

const BASE_URL = 'https://blog.niina.pro'

export default defineEventHandler(async (event) => {
  const allDocs = await queryCollection(event, 'posts')
    .select('path', 'categories', 'tags', 'draft')
    .order('date', 'DESC')
    .all()

  // 草稿页不进列表，也就没有任何页面链到它；nuxt generate 靠爬链接出静态文件，
  // 这些路径在产物里不存在。和 rss.xml 一样先滤掉，否则 sitemap 里挂着 404。
  // 分类/标签路由也从滤过的集合推，避免只存在于草稿里的分类变成死链。
  const docs = allDocs.filter(doc => !doc.draft)

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
