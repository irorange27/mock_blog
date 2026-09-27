import { queryCollection } from '@nuxt/content/server'
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

// v3 的 body 是 minimark AST：元素为 [tag, props, ...children]，文本为 string
type MinimarkNode = string | [string, Record<string, unknown>, ...unknown[]]

function nodeToHtml(node: unknown): string {
  if (typeof node === 'string') return escapeHtml(node)
  if (!Array.isArray(node)) return ''
  const [tag, props, ...children] = node as [string, Record<string, unknown>, ...unknown[]]
  if (typeof tag !== 'string') return ''

  const attrs = props && typeof props === 'object'
    ? Object.entries(props)
      .map(([key, value]) => ` ${key}="${escapeHtml(String(value))}"`)
      .join('')
    : ''

  const inner = children.map(nodeToHtml).join('')

  if (VOID_ELEMENTS.has(tag.toLowerCase())) {
    return `<${tag}${attrs} />`
  }

  return `<${tag}${attrs}>${inner}</${tag}>`
}

function bodyToHtml(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  // MinimalTree = { type: 'minimal', value: MinimarkNode[] }，兼容裸数组形态
  const nodes = Array.isArray(body)
    ? body
    : (body as { value?: unknown[] }).value
  return Array.isArray(nodes) ? nodes.map(nodeToHtml).join('') : ''
}

export default defineEventHandler(async (event) => {
  const feed = new RSS({
    title: "Niina's Blog",
    site_url: BASE_URL,
    feed_url: `${BASE_URL}/rss.xml`,
  })

  const docs = await queryCollection(event, 'posts')
    .select('path', 'title', 'date', 'description', 'draft', 'body')
    .order('date', 'DESC')
    .all()

  const blogPosts = docs.filter(doc => !doc.draft)

  for (const doc of blogPosts) {
    feed.item({
      title: doc.title ?? '-',
      url: `${BASE_URL}${doc.path}`,
      date: doc.date,
      description: doc.description,
      custom_elements: [
        { 'content:encoded': { _cdata: bodyToHtml(doc.body) } }
      ],
    })
  }

  const feedString = feed.xml({ indent: true })
  event.node.res.setHeader('Content-Type', 'application/xml')
  event.node.res.end(feedString)
})
