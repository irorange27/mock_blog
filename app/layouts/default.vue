<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-900">
    <NavBar class="mx-auto max-w-7xl px-4 rounded-lg sm:px-6 lg:px-8 " />
    <main class="container mx-auto max-w-7xl px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div class="order-1 col-span-1 lg:col-span-3 lg:order-2">
          <slot />
        </div>
        
        <aside class="order-2 col-span-1 space-y-8 mb-8 lg:order-1">
          <div class="space-y-8 lg:sticky lg:top-8">
            <ProfileCard
              avatar="/avatar.png"
              github="https://github.com/irorange27"
              name="Niina"
            />
            <LazyCategoriesCard />
            <LazyTagCard />
          </div>
        </aside>
      </div>
    </main>

    <footer class="bg-white dark:bg-gray-800 py-6 mt-12">
      <div class="container mx-auto px-4 text-center text-gray-600 dark:text-gray-300 mt-auto">
        &copy; 2024 - {{ currentYear }} Niina's Blog. All rights reserved.
      </div>
    </footer>
  </div>
</template>
