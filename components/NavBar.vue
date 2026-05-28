<template>
  <nav class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-gray-100">
          Niina's Blog
        </NuxtLink>
        
        <!-- Desktop navigation -->
        <div class="hidden md:flex items-center space-x-6">
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.path"
            :to="item.path"
            class="font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            active-class="text-blue-600 dark:text-blue-400"
          >
            {{ item.name }}
          </NuxtLink>
          <ColorModeSwitch class="w-5 h-5 dark:text-gray-100" />
        </div>

        <!-- Mobile controls -->
        <div class="md:hidden flex items-center space-x-2">
          <ColorModeSwitch class="w-5 h-5 dark:text-gray-100" />
          <button @click="toggleMobileMenu" class="p-2">
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="isMobileMenuOpen" class="md:hidden bg-white dark:bg-gray-800 border-t dark:border-gray-700">
      <NuxtLink 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="block font-bold px-4 py-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        active-class="bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400"
        @click="isMobileMenuOpen = false"
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
  { name: '友链', path: '/links' },
  { name: '关于', path: '/about' }
]

const isMobileMenuOpen = ref(false)
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>
