<script setup lang="ts">
const { categories, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="rounded-2xl p-5 bg-white/60 dark:bg-gray-800/60">
    <h2 class="text-sm font-bold mb-3 dark:text-gray-100">分类</h2>
    
    <div v-if="status === 'pending'" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
    </div>

    <div v-else-if="error" class="text-red-500 py-4 text-sm">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="mt-1 underline text-blue-400">重试</button>
    </div>
    
    <div v-else>
      <NuxtLink
        v-for="category in categories"
        :key="category.name"
        :to="`/categories/${category.name}`"
        class="flex items-center justify-between w-full px-3 py-2.5 rounded-xl dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-sm"
      >
        <span>{{ category.name }}</span>
        <span class="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400">
          {{ category.count }}
        </span>
      </NuxtLink>
      
      <div v-if="categories.length === 0" class="text-gray-400 dark:text-gray-600 text-center py-4 text-sm">
        暂无分类
      </div>
    </div>
  </div> 
</template>
