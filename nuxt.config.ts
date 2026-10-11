// https://nuxt.com/docs/api/configuration/nuxt-config
// python3：shiki 内置只有 python/py，把 python 语法改名注册，```python3 代码块才能高亮
const __pyGrammar = (await import('@shikijs/langs/python')).default
const python3 = { ...(Array.isArray(__pyGrammar) ? __pyGrammar[0] : __pyGrammar), name: 'python3', displayName: 'Python 3' }

export default defineNuxtConfig({
  compatibilityDate: '2024-12-31',
  srcDir: 'app/',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxt/test-utils/module',
    '@nuxtjs/color-mode',
  ],
  icon: {
    collections: ['mdi'],
  },
  content: {
    build: {
      markdown: {
        toc: { depth: 3 },
        // GFM（表格/删除线/任务列表）v3 由 @nuxtjs/mdc 内置，无需 remark-gfm
        remarkPlugins: { 'remark-math': {} },
        rehypePlugins: { 'rehype-katex': {} },
        // 高亮配置的规范位置：v3 会把它转发给 @nuxtjs/mdc 并在渲染管线读取。
        // （content.build.highlight 是死配置，运行时不读，别往那里写）
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          // langs 覆盖 shiki 默认语言集 = v3 默认 ∪ v2 preload 全部语言。
          // python3：shiki 内置只有 python/py，把 python 语法改名注册，
          // 文章里 ```python3 的代码块才能高亮
          langs: [
            'js', 'jsx', 'json', 'ts', 'tsx', 'vue', 'css', 'html', 'bash', 'md', 'mdc', 'yaml', 'shell', 'python', 'py',
            python3,
          ],
        },
      },
    },
  },
  nitro: {
    prerender: {
      routes: ['/rss.xml', '/sitemap.xml'],
      failOnError: false,
    },
  },
  // /tags 的汇总在 /categories（分类与标签同页），把直觉 URL 接住
  routeRules: {
    '/tags': { redirect: '/categories' },
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // 正文字体提前加载，减少 font-display: swap 的回退闪烁窗口
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/LXGWWenKai-Regular.woff2', crossorigin: '' },
      ],
      htmlAttrs: {
        lang: 'zh-CN',
      },
    }
  },
  css: ['@/assets/css/main.css', 'katex/dist/katex.min.css'],
  vite: {
    optimizeDeps: {
      include: ['vue-easy-lightbox'],
    },
  },
})
