<script setup lang="ts">
const route = useRoute()
const { getPostsByTag } = useBlogData()

const taggedPosts = getPostsByTag(route.params.tag as string)

useSeoMeta({
  title: () => `${route.params.tag} | Niina's Blog`,
  description: () => `标签「${route.params.tag}」下的所有文章。`,
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-8">
    <header class="mb-8">
      <h1 class="text-lg font-bold mb-2 dark:text-gray-100">
        标签: {{ route.params.tag }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        共 {{ taggedPosts.length }} 篇文章
      </p>
    </header>

    <div class="space-y-6">
      <article v-for="post in taggedPosts" :key="post._path" 
        class="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
        <NuxtLink :to="post._path">
          <h2 class="text-lg font-bold dark:text-gray-100 mb-2 hover:text-blue-500 dark:hover:text-blue-400">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <span>{{ post.categories || '默认' }}</span>
          <span class="mx-2">·</span>
          <div class="flex gap-2">
            <NuxtLink 
              v-for="t in post.tags" 
              :key="t"
              :to="`/tags/${t}`"
              class="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              {{ t }}
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
