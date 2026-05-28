// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-12-31',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxt/test-utils/module',
    '@nuxtjs/color-mode',
    'nuxt-toc',
  ],
  nitro: {
    prerender: {
      routes: ['/rss.xml'],
    },
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  content: {
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
  // Tailwind 配置
  css: ['@/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
})