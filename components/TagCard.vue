<template>
  <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md dark:text-gray-100">
    <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">标签</h2>
    
    <div v-if="isLoading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else-if="isError" class="text-red-500 py-4">
      <p>{{ errorMessage }}</p>
      <button @click="retry" class="ml-2 text-sm underline">重试</button>
    </div>
    
    <div v-else class="flex flex-wrap gap-2 mb-6">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.name"
        :to="`/tags/${tag.name}`"
        class="px-3 py-1 rounded-lg transition bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-100"
      >
        {{ tag.name }}
        <span class="text-sm ml-1 text-gray-400">{{ tag.count }}</span>
      </NuxtLink>
      
      <div v-if="tags.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">
        暂无标签
      </div>
    </div>
  </div>
</template>

<script setup>
const { tags, isLoading, fetchPosts } = useBlogData()
const { error, isError, errorMessage, retry } = useComponentError('标签加载失败')

await fetchPosts()
</script>
