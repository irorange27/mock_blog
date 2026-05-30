declare module 'rss' {
  interface RSSOptions {
    title: string
    site_url: string
    feed_url: string
    description?: string
  }

  interface FeedItem {
    title: string
    url: string
    date: string
    description?: string
    custom_elements?: Record<string, unknown>[]
  }

  class RSS {
    constructor(options: RSSOptions)
    item(options: FeedItem): void
    xml(options?: { indent?: boolean }): string
  }

  export default RSS
}
