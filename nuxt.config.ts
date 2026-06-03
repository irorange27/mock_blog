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
      ],
      rehypePlugins: [],
    },
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',  
      },
      preload: ['js', 'ts', 'css', 'html', 'bash', 'vue', 'shell', 'mdc', 'md', 'yaml']
    }
  },
  nitro: {
    prerender: {
      routes: ['/rss.xml', '/sitemap.xml'],
      failOnError: false,
    },
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      htmlAttrs: {
        lang: 'zh-CN',
      },
    }
  },
  css: ['@/assets/css/main.css'],
})
