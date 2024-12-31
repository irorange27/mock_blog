import { serverQueryContent } from '#content/server'
import RSS from 'rss'

const BASE_URL = "https://blog.niina.fun"

const feed = new RSS({
    title: "Niina's Blog",
    site_url: BASE_URL,
    feed_url: BASE_URL + "/rss.xml",
})

export default defineEventHandler(async (event) => {
    const docs = await serverQueryContent(event).sort({ date: -1 }).where({ _partial: false }).find();
    const blogPosts = docs.filter((doc) => doc?._path?.startsWith('/posts/'))

    for (const doc of blogPosts) {
        feed.item({
          title: doc.title ?? '-',
          url: `${BASE_URL}${doc._path}`,
          date: doc.date,
          description: doc.description,
        })
      }
      
    const feedString = feed.xml({ indent: true })
    // event.res is deprecated but worked
    event.res.setHeader('Content-Type', 'text/xml')
    event.res.end(feedString)
})