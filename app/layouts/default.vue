<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <!-- 不要在这里加 overflow-hidden：它会让容器成为 sticky 后代的滚动容器，破坏全站 position:sticky（横向溢出已由 html 的 overflow-x:hidden 处理） -->
  <div class="min-h-screen bg-[var(--page-bg)]">
    <NavBar />
    <main class="container mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-10">
      <!-- Mobile: compact profile above content -->
      <div class="lg:hidden mb-5">
        <ProfileCard
          avatar="/avatar.png"
          github="https://github.com/irorange27"
          name="Niina"
          compact
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside class="order-2 lg:order-1">
          <div class="space-y-6 lg:sticky lg:top-20">
            <div class="hidden lg:block">
              <ProfileCard
                avatar="/avatar.png"
                github="https://github.com/irorange27"
                name="Niina"
              />
            </div>
            <CategoriesCard />
            <TagCard />
          </div>
        </aside>

        <div class="order-1 lg:order-2">
          <slot />
        </div>
      </div>
    </main>

    <footer class="py-8 mt-4">
      <div class="container mx-auto max-w-6xl px-4 text-center text-[var(--txt-30)] text-sm space-y-1">
        <p>&copy; 2024 - {{ currentYear }} Niina's Blog</p>
        <a href="/rss.xml" target="_blank" class="inline-flex items-center gap-1 hover:text-[var(--txt-50)] transition-colors" aria-label="RSS 订阅">
          <Icon name="mdi:rss" class="w-3.5 h-3.5" />
          <span>RSS</span>
        </a>
      </div>
    </footer>

    <ClientOnly>
      <CodeCopy />
      <ImageLightbox />
      <BackToTop />
    </ClientOnly>
  </div>
</template>
