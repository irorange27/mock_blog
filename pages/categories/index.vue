<template>
  <div class="space-y-8">
    <!-- 分类列表 -->
    <div class="bg-white rounded-lg shadow-md p-8">
      <h2 class="text-2xl font-bold mb-6">分类</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="category in categories"
          :key="category.name"
          :to="`/categories/${category.name}`"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <span class="font-medium">{{ category.name }}</span>
          <span class="text-gray-500">{{ category.count }} 篇</span>
        </NuxtLink>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-8">
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-for="tag in tags"
          :key="tag.name"
          :to="`/tags/${tag.name}`"
          class="px-4 py-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"
        >
          <span>{{ tag.name }}</span>
          <span class="text-gray-500 text-sm ml-1">({{ tag.count }})</span>
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