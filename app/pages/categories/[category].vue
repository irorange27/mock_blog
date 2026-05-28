<script setup lang="ts">
const route = useRoute()
const { getPostsByCategory } = useBlogData()

const filteredPosts = getPostsByCategory(route.params.category as string)

useSeoMeta({
  title: () => `${route.params.category} | Niina's Blog`,
  description: () => `分类「${route.params.category}」下的所有文章。`,
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-8">
    <header class="mb-8">
      <h1 class="text-lg font-bold mb-2 dark:text-gray-100">
        分类: {{ route.params.category }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        共 {{ filteredPosts.length }} 篇文章
      </p>
    </header>

    <div class="space-y-6">
      <article v-for="post in filteredPosts" :key="post._path" 
        class="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
        <NuxtLink :to="post._path">
          <h2 class="text-lg font-bold dark:text-gray-100 mb-2 hover:text-blue-500 dark:hover:text-blue-400">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <div class="flex gap-2">
            <NuxtLink 
              v-for="tag in post.tags" 
              :key="tag"
              :to="`/tags/${tag}`"
              class="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              {{ tag }}
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
