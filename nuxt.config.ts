// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxt/test-utils/module',
    '@nuxtjs/color-mode',
  ],
  // router: {
  //   extendRoutes(routes, resolve) {
  //     routes.push({
  //       name: 'custom-404',
  //       path: '*',
  //       component: resolve(__dirname, 'pages/404.vue'),
  //     })
  //   }
  // },
  content: {
    markdown: {
      toc: { depth: 3},
        remarkPlugins: [],
        rehypePlugins: [],
    },
      highlight: {
        theme: {
          default: 'github-light',
          dark: 'github-dark',  
        },
        preload: ['js', 'ts', 'css', 'html', 'bash', 'vue']
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