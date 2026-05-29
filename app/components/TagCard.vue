<script setup lang="ts">
const { tags, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="rounded-2xl p-5 bg-white/60 dark:bg-gray-800/60">
    <h2 class="text-sm font-bold mb-3 dark:text-gray-100">标签</h2>
    
    <div v-if="status === 'pending'" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
    </div>
    
    <div v-else-if="error" class="text-red-500 py-4 text-sm">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="mt-1 underline text-blue-400">重试</button>
    </div>
    
    <div v-else class="flex flex-wrap gap-1.5">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.name"
        :to="`/tags/${tag.name}`"
        class="px-2.5 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
      >
        {{ tag.name }}
        <span class="ml-0.5 opacity-50">{{ tag.count }}</span>
      </NuxtLink>
      
      <div v-if="tags.length === 0" class="text-gray-400 dark:text-gray-600 text-center py-4 w-full text-sm">
        暂无标签
      </div>
    </div>
  </div>
</template>
