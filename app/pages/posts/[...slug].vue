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
  <article class="bg-white dark:bg-gray-800 rounded-lg p-8">
    <header class="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
      <h1 class="text-lg dark:text-gray-100 font-bold mb-4">{{ data?.title }}</h1>
      <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
        <span>{{ formatDate(data?.date) }}</span>
        <span class="mx-2">·</span>
        <NuxtLink
          :to="`/categories/${data?.categories || '默认'}`"
          class="dark:hover:text-blue-400 hover:text-blue-500"
        >
          {{ data?.categories || '默认' }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <div class="flex gap-2">
          <NuxtLink
            v-for="tag in data?.tags"
            :key="tag"
            :to="`/tags/${tag}`"
            class="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
          >
            {{ tag }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="prose prose-lg max-w-none dark:text-gray-100 dark:prose-invert">
      <TableOfContents v-if="data?.body?.toc" :toc="data.body.toc" :title="data?.title" />
      <hr v-if="data?.body?.toc">
      <ContentRenderer v-if="data" :value="data" />
    </div>
  </article>
</template>

<style>
.prose {
  --tw-prose-body: #374151;
  --tw-prose-headings: #111827;
  --tw-prose-code: #111827;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: #f7faff;
  --tw-prose-blockquote: #6b7280;
}

.prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
  font-weight: 700;
}

.prose p {
  margin: 1.25em 0;
}

.prose a {
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
  color: #2563eb;
}

.prose a:visited {
  color: #4f46e5;
}

.dark .prose {
  --tw-prose-body: #d1d5db;
  --tw-prose-headings: #f3f4f6;
  --tw-prose-code: #e5e7eb;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: oklch(0.2 0.04 250);
  --tw-prose-blockquote: #9ca3af;
}

.dark .prose a {
  color: #60a5fa;
}

.dark .prose a:hover {
  color: #93bbfd;
}

.dark .prose a:visited {
  color: #818cf8;
}

.light .prose pre {
  background-color: var(--tw-prose-pre-bg);
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
}

.dark .prose pre {
  background-color: oklch(0.2 0.04 250);
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
}

.light .prose code:not(pre code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.dark .prose code:not(pre code) {
  background-color: #374151;
  color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose blockquote {
  border-left-width: 4px;
  padding-left: 1rem;
  font-style: italic;
}

.light .prose blockquote {
  border-left-color: #e5e7eb;
}

.dark .prose blockquote {
  border-left-color: #4b5563;
  color: #d1d5db;
}
</style>
