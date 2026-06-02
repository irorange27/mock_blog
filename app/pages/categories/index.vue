<script setup lang="ts">
useSeoMeta({
  title: '分类与标签 | Niina\'s Blog',
  description: '所有文章分类和标签。',
})

const { categories, tags } = useBlogData()
</script>

<template>
  <div class="space-y-4 sm:space-y-8">
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-8">
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

    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-8">
      <h2 class="text-2xl font-bold mb-6 dark:text-gray-100">标签</h2>
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
