<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
    <NavBar />
    <main class="container mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-10">
        <aside class="order-1 lg:order-1">
          <div class="lg:space-y-6 lg:sticky lg:top-20">
            <div class="flex lg:flex-col items-center lg:items-stretch gap-3 lg:gap-0 lg:space-y-6 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              <div class="shrink-0 lg:shrink">
                <ProfileCard
                  avatar="/avatar.png"
                  github="https://github.com/irorange27"
                  name="Niina"
                />
              </div>
              <div class="shrink-0 lg:shrink">
                <LazyCategoriesCard />
              </div>
              <div class="shrink-0 lg:shrink">
                <LazyTagCard />
              </div>
            </div>
          </div>
        </aside>

        <div class="order-2 lg:order-2">
          <slot />
        </div>
      </div>
    </main>

    <footer class="py-8 mt-4">
      <div class="container mx-auto max-w-6xl px-4 text-center text-gray-400 dark:text-gray-600 text-sm">
        &copy; 2024 - {{ currentYear }} Niina's Blog
      </div>
    </footer>

    <ClientOnly>
      <CodeCopy />
      <ImageLightbox />
    </ClientOnly>
  </div>
</template>
