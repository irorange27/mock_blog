import { serverQueryContent } from '#content/server'
import RSS from 'rss'

const BASE_URL = 'https://blog.niina.fun'

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
])

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface HastNode {
  type: string
  tag?: string
  value?: string
  props?: Record<string, string>
  children?: HastNode[]
}

function hastToHtml(node: HastNode): string {
  const type = node.type as string

  if (type === 'text') {
    return escapeHtml(node.value ?? '')
  }

  if (type === 'root' || type === 'element') {
    const children = node.children ?? []

    if (type === 'root') {
      return children.map(hastToHtml).join('')
    }

    const tag = node.tag ?? ''
    const props = node.props ?? {}

    const attrs = Object.entries(props)
      .map(([key, value]) => ` ${key}="${escapeHtml(String(value))}"`)
      .join('')

    if (VOID_ELEMENTS.has(tag)) {
      return `<${tag}${attrs} />`
    }

    const inner = children.map(hastToHtml).join('')
    return `<${tag}${attrs}>${inner}</${tag}>`
  }

  return ''
}

export default defineEventHandler(async (event) => {
  const feed = new RSS({
    title: "Niina's Blog",
    site_url: BASE_URL,
    feed_url: `${BASE_URL}/rss.xml`,
  })

  const docs = await serverQueryContent(event)
    .sort({ date: -1 })
    .where({ _partial: false })
    .find()

  const blogPosts = docs.filter(doc => doc?._path?.startsWith('/posts/'))

  for (const doc of blogPosts) {
    const htmlContent = doc.body ? hastToHtml(doc.body) : ''

    feed.item({
      title: doc.title ?? '-',
      url: `${BASE_URL}${doc._path}`,
      date: doc.date,
      description: doc.description,
      custom_elements: [
        { 'content:encoded': { _cdata: htmlContent } }
      ],
    })
  }

  const feedString = feed.xml({ indent: true })
  event.node.res.setHeader('Content-Type', 'application/xml')
  event.node.res.end(feedString)
})
