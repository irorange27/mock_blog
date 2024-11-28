<template>
  <nav :class="theme === 'dark' ? 'dark' : 'light'" class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo/网站名称 -->
        <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-gray-200">
          Niina's Blog
        </NuxtLink>
         <!-- 导航链接 -->
        <div class="hidden md:flex space-x-8">
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.path"
            :to="item.path"
            class="text-gray-600 bg-rounded-lg font-bold dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="text-blue-600 font-bold dark:text-blue-400"
          >
            {{ item.name }}
          </NuxtLink>
          
        </div>
        <ColorModeSwitch class="hidden md:flex focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300" />

        
         <!-- 手机端导航按钮 -->
        <button @click="toggleMobileMenu" class="flex items-center space-x-5 justify-y-center p-2 md:hidden">
          <ColorModeSwitch class="hidden md:flex focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300" />
          <svg class="w-5 h-5 text-gray-600 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>
    </div>
     <!-- 手机端导航菜单 -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-white dark:bg-gray-800">
      <NuxtLink 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="block font-bold px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        active-class="bg-gray-100 font-bold dark:bg-gray-700 text-blue-600 dark:text-blue-400"
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
</script> 