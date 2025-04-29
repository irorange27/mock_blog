<template>
  <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md dark:text-gray-100">
    <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">标签</h2>
    
    <!-- 标签列表 -->
    <div class="flex flex-wrap gap-2 mb-6">
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
        <span class="text-sm ml-1">({{ tag.count }})</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { getTags } = usePostData()
const tags = ref([])

onMounted(async () => {
  tags.value = await getTags()
})
</script>