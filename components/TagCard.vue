<template>
  <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md dark:text-gray-100">
    <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">标签</h2>
    
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="text-red-500 py-4">
      加载标签失败，请稍后再试
      <button @click="loadTags" class="ml-2 text-sm underline">重试</button>
    </div>
    
    <!-- 标签列表 -->
    <div v-else class="flex flex-wrap gap-2 mb-6">
      <NuxtLink
        v-for="tag in tags"
        :key="tag.name"
        :to="`/tags/${tag.name}`"
        :class="[
          'px-3 py-1 rounded-lg transition',
          'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-100',
        ]"
      >
        {{ tag.name }}
        <span class="text-sm ml-1 text-gray-400">{{ tag.count }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { getTags } = usePostData()
const tags = ref([])
const loading = ref(true)
const error = ref(false)

const loadTags = async () => {
  loading.value = true
  error.value = false
  try {
    tags.value = await getTags()
  } catch (e) {
    console.error('Failed to load tags:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTags()
})
</script>