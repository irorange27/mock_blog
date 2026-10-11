<script setup lang="ts">
const currentYear = new Date().getFullYear()

// 只有首页挂侧栏（Profile + 动态）；文章页与其余页面都是单列，专注内容
const route = useRoute()
const hasSidebar = computed(() => route.path === '/')
</script>

<template>
  <!-- 不要在这里加 overflow-hidden：它会让容器成为 sticky 后代的滚动容器，破坏全站 position:sticky（横向溢出已由 html 的 overflow-x:hidden 处理） -->
  <div class="min-h-screen bg-[var(--page-bg)]">
    <!-- 跳过导航直达主内容（WCAG 2.4.1）：默认不可见，键盘聚焦时显示 -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--btn-solid-bg)] focus:text-[var(--btn-solid-fg)]"
    >跳到主内容</a>
    <NavBar />
    <!-- 首页不设 max-w，内容铺满视口；其余页面保持 container 宽度 -->
    <main id="main-content" :class="hasSidebar
      ? 'mx-auto w-full px-3 sm:px-6 py-6 sm:py-10'
      : 'container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-10'">
      <!-- Mobile: compact profile above content；首页时动态卡片也在这里（文章列表上方，见 MomentsCard 内的条数限制） -->
      <div class="lg:hidden mb-5">
        <ProfileCard
          avatar="/avatar.png"
          github="https://github.com/irorange27"
          name="Niina"
          compact
        />
        <MomentsCard v-if="hasSidebar" class="mt-6" />
      </div>

      <!-- 只有首页是侧栏 + 正文双栏（1 : 1.67，fr 弹性不写死像素）；其余页面单列居中 -->
      <div :class="hasSidebar
        ? 'grid grid-cols-1 lg:grid-cols-[1fr_1.67fr] gap-8 lg:gap-12'
        : 'flex justify-center'">
        <aside v-if="hasSidebar" aria-label="侧栏" class="order-2 lg:order-1">
          <div class="space-y-6 lg:sticky lg:top-20">
            <div class="hidden lg:block">
              <ProfileCard
                avatar="/avatar.png"
                github="https://github.com/irorange27"
                name="Niina"
              />
            </div>
            <!-- 分类/标签卡片已 deprecated（组件保留在 components/ 下，未删除） -->
            <!-- 移动端的动态卡片在上面渲染过了，这里只在桌面端显示，避免重复 -->
            <div class="hidden lg:block">
              <MomentsCard />
            </div>
          </div>
        </aside>

        <!-- min-w-0：1fr 栅格列默认的最小尺寸是 min-content，而行间公式是 nowrap 的长行，
             不收缩就会把正文列整个顶宽、越过 max-w-6xl 撞上右侧固定目录。允许收缩后，
             列宽只由断点决定，超宽内容各自在列内滚动（见 main.css 的 .katex-display） -->
        <!-- paper：非首页的内容页不套卡片，纸面平铺（见 main.css 的 .paper）；
             max-w-2xl 约束阅读宽度（接近纸质书版心） -->
        <div :class="hasSidebar ? 'order-1 lg:order-2 min-w-0' : 'paper w-full max-w-2xl min-w-0'">
          <slot />
        </div>
      </div>
    </main>

    <footer class="py-8 mt-4">
      <div :class="hasSidebar
        ? 'mx-auto w-full px-3 sm:px-6 text-center text-[var(--txt-30)] text-sm space-y-1'
        : 'container mx-auto max-w-7xl px-4 text-center text-[var(--txt-30)] text-sm space-y-1'">
        <p>&copy; 2024 - {{ currentYear }} Niina's Blog</p>
        <a href="/rss.xml" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 hover:text-[var(--txt-50)] transition-colors" aria-label="RSS 订阅（新窗口打开）">
          <Icon name="mdi:rss" class="w-3.5 h-3.5" aria-hidden="true" />
          <span>RSS</span>
        </a>
      </div>
    </footer>

    <ClientOnly>
      <CodeCopy />
      <CodeRunner />
      <ImageLightbox />
      <BackToTop />
    </ClientOnly>
  </div>
</template>
