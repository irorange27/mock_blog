<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <h2 class="text-2xl dark:text-gray-100 font-bold mb-4 border-l-4 border-blue-200 pl-2">分类</h2>
    
    <div v-if="isLoading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="isError" class="text-red-500 py-4">
      <p>{{ errorMessage }}</p>
      <button @click="retry" class="ml-2 text-sm underline">重试</button>
    </div>
    
    <div v-else>
      <NuxtLink
        v-for="category in categories"
        :key="category.name"
        :to="`/categories/${category.name}`"
        class="flex items-center justify-between w-full p-4 rounded-lg dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <span class="font-medium">{{ category.name }}</span>
        <span class="text-gray-500 dark:text-gray-400 rounded-lg bg-blue-100 dark:bg-blue-900 px-2 py-1">
          {{ category.count }}
        </span>
      </NuxtLink>
      
      <div v-if="categories.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">
        暂无分类
      </div>
    </div>
  </div> 
</template>

<script setup>
const { categories, isLoading, fetchPosts } = useBlogData()
const { error, isError, errorMessage, retry } = useComponentError('分类加载失败')

await fetchPosts()
</script>
