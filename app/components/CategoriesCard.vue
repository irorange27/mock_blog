<script setup lang="ts">
const { categories, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-8">
    <h2 class="text-lg dark:text-gray-100 font-bold mb-4 border-l-4 border-blue-200 dark:border-blue-400 pl-2">分类</h2>
    
    <div v-if="status === 'pending'" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
    </div>

    <div v-else-if="error" class="text-red-500 py-4">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="ml-2 text-sm underline">重试</button>
    </div>
    
    <div v-else>
      <NuxtLink
        v-for="category in categories"
        :key="category.name"
        :to="`/categories/${category.name}`"
        class="flex items-center justify-between w-full p-4 rounded-lg dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <span class="font-medium">{{ category.name }}</span>
        <span class="text-blue-600 dark:text-blue-300 rounded-lg bg-blue-50 dark:bg-blue-950 px-2 py-1">
          {{ category.count }}
        </span>
      </NuxtLink>
      
      <div v-if="categories.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">
        暂无分类
      </div>
    </div>
  </div> 
</template>
