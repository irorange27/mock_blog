<template>
  <article class="bg-white rounded-lg shadow-md p-8">
    <!-- 文章头部信息 -->
    <header class="mb-8 pb-8 border-b">
      <h1 class="text-3xl font-bold mb-4">{{ data?.title }}</h1>
      <div class="flex items-center text-gray-500 text-sm">
        <span>{{ formatDate(data?.date) }}</span>
        <span class="mx-2">·</span>
        <NuxtLink 
          :to="`/categories/${data?.categories || '默认'}`"
          class="hover:text-blue-600"
        >
          {{ data?.categories || '默认' }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <div class="flex gap-2">
          <NuxtLink 
            v-for="tag in data?.tags" 
            :key="tag"
            :to="`/tags/${tag}`"
            class="px-2 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            {{ tag }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- 文章内容 -->
    <div class="prose prose-lg max-w-none">
      <ContentRenderer :value="data" />
    </div>

    <!-- 文章目录 -->
    <nav v-if="toc?.links?.length" class="fixed top-24 right-8 w-64 hidden xl:block">
      <div class="bg-white p-4 rounded-lg shadow-md">
        <h2 class="text-lg font-bold mb-2">目录</h2>
        <ContentToc :links="toc.links" />
      </div>
    </nav>
  </article>
</template>

<script setup>
const route = useRoute()
const { data, toc } = await useAsyncData(`content-${route.path}`, () => {
  return queryContent(route.path).findOne()
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style>
/* 自定义 prose 样式 */
.prose {
  font-family: 'LXGWWenKai';
  --tw-prose-body: #374151;
  --tw-prose-headings: #111827;
  --tw-prose-links: #4264ad;
  --tw-prose-code: #111827;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: #1f2937;
  --tw-prose-blockquote: #6b7280;
}

/* 代码块样式 */
.prose pre {
  background-color: var(--tw-prose-pre-bg);
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
}

/* 行内代码样式 */
.prose code:not(pre code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

/* 引用块样式 */
.prose blockquote {
  border-left-width: 4px;
  border-left-color: #e5e7eb;
  padding-left: 1rem;
  font-style: italic;
}

/* 表格样式 */
.prose table {
  width: 100%;
  border-collapse: collapse;
}

.prose th,
.prose td {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
}

.prose th {
  background-color: #f9fafb;
  font-weight: 600;
}
</style> 