<script setup lang="ts">
const route = useRoute()
const { data } = await useAsyncData(`content-${route.path}`, () => {
  return queryContent(route.path).findOne()
})

const { posts } = useBlogData()
const adjacent = computed(() => {
  const idx = posts.value.findIndex(p => p._path === route.path)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx < posts.value.length - 1 ? posts.value[idx + 1] : null,
    next: idx > 0 ? posts.value[idx - 1] : null,
  }
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
  <article class="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-8 max-w-full">
    <header class="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200 dark:border-gray-700">
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

    <div v-if="data?.body?.toc?.links?.length" class="mb-8 lg:sticky lg:top-16 z-10">
      <TableOfContents :toc="data.body.toc.links" :title="data?.title" />
    </div>

    <div class="prose max-w-4xl dark:text-gray-100">
      <ContentRenderer v-if="data" :value="data" />
    </div>

    <nav v-if="adjacent.prev || adjacent.next" class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-if="adjacent.prev"
        :to="adjacent.prev._path"
        class="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
      >
        <span class="text-xs text-gray-400 dark:text-gray-500">← 上一篇</span>
        <p class="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {{ adjacent.prev.title }}
        </p>
      </NuxtLink>
      <NuxtLink
        v-if="adjacent.next"
        :to="adjacent.next._path"
        class="group p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors sm:text-right"
      >
        <span class="text-xs text-gray-400 dark:text-gray-500">下一篇 →</span>
        <p class="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {{ adjacent.next.title }}
        </p>
      </NuxtLink>
    </nav>
  </article>
</template>
