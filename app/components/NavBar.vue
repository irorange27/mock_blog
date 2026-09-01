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
  <nav class="sticky top-0 z-50 bg-[var(--nav-bg)] backdrop-blur-md">
    <div class="container mx-auto max-w-6xl px-4 sm:px-6">
      <div class="flex items-center justify-between h-14">
        <NuxtLink to="/" class="text-lg font-bold text-[var(--txt-90)]">
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
              ? 'text-[var(--primary)] font-bold'
              : 'text-[var(--txt-30)] hover:text-[var(--txt-90)]'"
          >
            {{ item.name }}
          </NuxtLink>
          <ColorModeSwitch />
        </div>

        <!-- Mobile controls -->
        <div class="md:hidden flex items-center space-x-2">
          <ColorModeSwitch />
          <button @click="toggleMobileMenu" class="p-2 text-[var(--txt-30)]" aria-label="菜单">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-[var(--card-bg)] border-t border-[var(--line-color)]">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="block px-4 py-3 text-sm transition-colors"
        :class="isActive(item.path)
          ? 'text-[var(--primary)] font-bold bg-[var(--panel-bg)]'
          : 'text-[var(--txt-30)] hover:text-[var(--txt-90)]'"
        @click="isMobileMenuOpen = false"
      >
        {{ item.name }}
      </NuxtLink>
    </div>
  </nav>
</template>
