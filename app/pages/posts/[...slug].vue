<script setup lang="ts">
const route = useRoute()
const { data } = await useAsyncData(`content-${route.path}`, () => {
  return queryContent(route.path).findOne()
})

useSeoMeta({
  title: () => data.value?.title ? `${data.value.title} | Niina's Blog` : "Niina's Blog",
  description: () => data.value?.description || data.value?.title || '',
  ogTitle: () => data.value?.title,
  ogDescription: () => data.value?.description || data.value?.title || '',
  ogType: 'article',
  articlePublishedTime: () => data.value?.date,
  articleTag: () => data.value?.tags || [],
})
</script>

<template>
  <article class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-8 max-w-full">
    <header class="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
      <h1 class="text-2xl dark:text-gray-100 font-bold mb-4">{{ data?.title }}</h1>
      <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
        <span>{{ formatDate(data?.date) }}</span>
        <span class="mx-2">·</span>
        <NuxtLink
          :to="`/categories/${data?.categories || '默认'}`"
          class="dark:hover:text-blue-400 hover:text-blue-500 transition-colors"
        >
          {{ data?.categories || '默认' }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <div class="flex gap-2">
          <NuxtLink
            v-for="tag in data?.tags"
            :key="tag"
            :to="`/tags/${tag}`"
            class="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            {{ tag }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="prose max-w-4xl dark:text-gray-100">
      <TableOfContents v-if="data?.body?.toc?.links?.length" :toc="data.body.toc.links" :title="data?.title" />
      <ContentRenderer v-if="data" :value="data" />
    </div>
  </article>
</template>
