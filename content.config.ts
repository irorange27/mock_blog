import { defineContentConfig, defineCollection, z } from '@nuxt/content'

// v3：集合即数据库表。frontmatter 想成为可查询列必须写进 schema，
// 未声明的字段会归入 meta。date 是 "YYYY-MM-DD HH:mm:ss" 字符串（定长，
// 字典序 = 时间序），tags 在 frontmatter 里可能为空（null）。
export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        date: z.string(),
        categories: z.string().default('默认'),
        tags: z.array(z.string()).nullish(),
        draft: z.boolean().default(false),
      }),
    }),
    // content/draft/ 是 gitignore 的本地草稿：不建集合 = 不进列表、URL 也由根级
    // [...404].vue 兜住（v2 即如此），完全不收录
    about: defineCollection({
      type: 'page',
      source: 'about.md',
    }),
    // links/ 下 index.md 与 friends_in_shu.md 都带 links: frontmatter，
    // 列表页合并两者的数组（对应 v2 queryContent('/links') 的前缀匹配）
    links: defineCollection({
      type: 'page',
      source: 'links/**',
      schema: z.object({
        links: z.array(z.any()).nullish(),
      }),
    }),
  },
})
