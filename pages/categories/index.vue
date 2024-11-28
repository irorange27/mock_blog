<template>
  <div class="space-y-8">
    <!-- 分类列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <h2 class="text-2xl font-bold mb-6 dark:text-gray-100">分类</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="category in categories"
          :key="category.name"
          :to="`/categories/${category.name}`"
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
        >
          <span class="font-medium dark:text-gray-100">{{ category.name }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ category.count }} 篇</span>
        </NuxtLink>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-for="tag in tags"
          :key="tag.name"
          :to="`/tags/${tag.name}`"
          class="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition"
        >
          <span class="dark:text-gray-100">{{ tag.name }}</span>
          <span class="text-gray-500 dark:text-gray-400 text-sm ml-1">({{ tag.count }})</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { getCategories, getTags } = usePostData()

const categories = ref([])
const tags = ref([])

onMounted(async () => {
  categories.value = await getCategories()
  tags.value = await getTags()
})
</script> 