<script setup lang="ts">
const route = useRoute()
const navItems = [
  { name: '首页', path: '/' },
  { name: '分类', path: '/categories' },
  { name: '归档', path: '/archives' },
  { name: '友链', path: '/links' },
  { name: '关于', path: '/about' }
]

const isMobileMenuOpen = ref(false)

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <nav class="sticky top-0 z-50 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md">
    <div class="container mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <NuxtLink to="/" class="text-lg font-bold text-gray-800 dark:text-gray-100">
          Niina's Blog
        </NuxtLink>
        
        <!-- Desktop navigation -->
        <div class="hidden md:flex items-center space-x-5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="text-sm transition-colors"
            :class="isActive(item.path)
              ? 'text-gray-800 dark:text-gray-100 font-semibold'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
          >
            {{ item.name }}
          </NuxtLink>
          <a href="/rss.xml" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all" aria-label="RSS 订阅">
            <Icon name="mdi:rss" class="w-4 h-4" />
          </a>
          <ColorModeSwitch />
        </div>

        <!-- Mobile controls -->
        <div class="md:hidden flex items-center space-x-2">
          <a href="/rss.xml" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all" aria-label="RSS 订阅">
            <Icon name="mdi:rss" class="w-4 h-4" />
          </a>
          <ColorModeSwitch />
          <button @click="toggleMobileMenu" class="p-2 text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200/60 dark:border-gray-700/60">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="block px-4 py-3 text-sm transition-colors"
        :class="isActive(item.path)
          ? 'text-gray-800 dark:text-gray-100 font-semibold bg-gray-50 dark:bg-gray-700/50'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
        @click="isMobileMenuOpen = false"
      >
        {{ item.name }}
      </NuxtLink>
    </div>
  </nav>
</template>
