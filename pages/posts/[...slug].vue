<template>
  <article class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <header class="mb-8 pb-8 border-b">
      <h1 class="text-3xl dark:text-gray-100 font-bold mb-4">{{ data?.title }}</h1>
      <div class="flex items-center text-gray-500 dark:text-gray-100 dark:bg-gray-700 text-sm">
        <span>{{ formatDate(data?.date) }}</span>
        <span class="mx-2">·</span>
        <NuxtLink
          :to="`/categories/${data?.categories || '默认'}`"
          class="dark:hover:text-blue-400 hover:text-blue-600"
        >
          {{ data?.categories || '默认' }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <div class="flex gap-2">
          <NuxtLink
            v-for="tag in data?.tags"
            :key="tag"
            :to="`/tags/${tag}`"
            class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
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

<script setup>
import { formatDate } from '~/utils/blog'

const route = useRoute()
const { data } = await useAsyncData(`content-${route.path}`, () => {
  return queryContent(route.path).findOne()
})
</script>

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
