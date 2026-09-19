import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
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
    contentHead: false,
    sources: {
      content: {
        driver: 'fs',
        base: resolve(__dirname, 'content'),
      },
    },
    markdown: {
      toc: { 
        depth: 3,
      },
      remarkPlugins: [
        'remark-gfm',
        'remark-math',
      ],
      rehypePlugins: [
        'rehype-katex',
      ],
    },
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',  
      },
      preload: ['js', 'ts', 'css', 'html', 'bash', 'vue', 'shell', 'mdc', 'md', 'yaml', 'python', 'py']
    }
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
