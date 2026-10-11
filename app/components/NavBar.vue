<script setup lang="ts">
const route = useRoute()

// 首页内容铺满视口（见 default.vue），导航随之去掉 max-w；其余页面保持 container
const isFullWidth = computed(() => route.path === '/')
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

// 菜单打开后焦点移入第一项，Esc 关闭并回到汉堡按钮（WCAG 2.1.2 / 2.4.3）
const mobileMenuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLButtonElement | null>(null)

watch(isMobileMenuOpen, (open) => {
  if (open) {
    nextTick(() => mobileMenuRef.value?.querySelector('a')?.focus())
    window.addEventListener('keydown', onMenuKeydown)
  } else {
    window.removeEventListener('keydown', onMenuKeydown)
  }
})

const onMenuKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isMobileMenuOpen.value = false
    menuButtonRef.value?.focus()
  }
}

onUnmounted(() => window.removeEventListener('keydown', onMenuKeydown))

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})
</script>

<template>
  <nav aria-label="主导航" class="sticky top-0 z-50 bg-[var(--nav-bg)] backdrop-blur-md">
    <div :class="isFullWidth ? 'mx-auto w-full px-3 sm:px-6' : 'container mx-auto max-w-6xl px-4 sm:px-6'">
      <div class="flex items-center justify-between h-14">
        <!-- 品牌即返回首页入口：字号配色与导航项一致（text-sm + 同套颜色变量）。
             内容页用导航「当前项」的主题色 + 左箭头强调回去的引导 -->
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1 text-sm font-bold transition-colors"
          :class="isFullWidth
            ? 'text-[var(--txt-90)] hover:text-[var(--primary)]'
            : 'text-[var(--primary)] hover:opacity-80'"
          :aria-label="isFullWidth ? undefined : '返回首页'"
        >
          <Icon
            v-if="!isFullWidth"
            name="mdi:arrow-left"
            class="w-4 h-4"
            aria-hidden="true"
          />
          Niina's Blog
        </NuxtLink>

        <!-- Desktop navigation -->
        <div class="hidden md:flex items-center space-x-5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="text-sm transition-colors"
            :aria-current="isActive(item.path) ? 'page' : undefined"
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
          <button
            ref="menuButtonRef"
            @click="toggleMobileMenu"
            class="p-2 text-[var(--txt-30)]"
            aria-label="菜单"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div
      v-if="isMobileMenuOpen"
      id="mobile-menu"
      ref="mobileMenuRef"
      class="md:hidden bg-[var(--card-bg)] border-t border-[var(--line-color)]"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="block px-4 py-3 text-sm transition-colors"
        :aria-current="isActive(item.path) ? 'page' : undefined"
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
