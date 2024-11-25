<template>
  <nav :class="theme === 'dark' ? 'dark' : 'light'" class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo/网站名称 -->
        <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-gray-200">
          Home
        </NuxtLink>
         <!-- 导航链接 -->
        <div class="hidden md:flex space-x-8">
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.path"
            :to="item.path"
            class="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="text-blue-600 dark:text-blue-400 font-medium"
          >
            {{ item.name }}
          </NuxtLink>
        </div>

        <!-- 切换模式按钮 -->
        <button @click="toggleTheme" class="focus:outline-none">
          <svg v-if="theme === 'light'" class="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
          <svg v-else class="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        </button>
         <!-- 手机端导航按钮 -->
        <button @click="toggleMobileMenu" class="md:hidden focus:outline-none">
          <svg class="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        
      </div>
    </div>
     <!-- 手机端导航菜单 -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-white dark:bg-gray-800 shadow-md">
      <NuxtLink 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        active-class="text-blue-600 dark:text-blue-400 font-medium"
        @click="toggleMobileMenu"
      >
        {{ item.name }}
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const navItems = [
  { name: '首页', path: '/' },
  { name: '分类', path: '/categories' },
  { name: '归档', path: '/archives' },
  { name: '关于', path: '/about' }
]

const isMobileMenuOpen = ref(false)
const toggleMobileMenu = () => {
 isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}
</script> 