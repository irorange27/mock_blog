<template>
  <div :class="theme === 'dark' ? 'dark' : ''" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavBar class="mx-auto max-w-7xl px-4 rounded-lg sm:px-6 lg:px-8 " />
    
    <main class="container mx-auto max-w-7xl px-4 py-8">
      <!-- 主要内容区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- 大屏幕时的侧边栏 -->
        <aside class="hidden lg:block lg:col-span-1">
          <div class="space-y-8 sticky top-8">
            <ProfileCard 
              avatar="/avatar.png"
              github="https://github.com/irorange27"
              name="Niina"
            />
            <CategoriesCard />
            <TagCard />
          </div>
        </aside>

        
        <!-- 内容区域 -->
        <div class="lg:col-span-3">
          <slot />
        </div>

        <!-- 小屏幕时的个人信息卡片 -->
        <div class="block space-y-8 lg:hidden mb-8">
            <ProfileCard 
            avatar="/avatar.png"
            github="https://github.com/irorange27"
            name="Niina"
            />
            <CategoriesCard />
            <TagCard />
        </div>
      </div>
    </main>

    <footer class="bg-white dark:bg-gray-800 py-6 mt-12">
      <div class="container mx-auto px-4 text-center text-gray-600 dark:text-gray-300 mt-auto">
        © 2024 Niina's Blog. All rights reserved.
      </div>
    </footer>
  </div>
</template> 

<script setup>

const theme = useColorMode()

</script>