<template>
  <article class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <!-- 文章头部信息 -->
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


    <!-- 文章内容 -->
    <div class="prose prose-lg max-w-none dark:text-gray-100 dark:prose-invert">
      <ContentRenderer :value="data" />
    </div>




  </article>

      <!-- 文章目录
      <nav v-if="headings.length" class="fixed top-24 right-8 w-64 hidden xl:block">
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h2 class="text-lg font-bold mb-2">目录</h2>
          <ul>
            <li v-for="heading in headings" :key="heading.id"
              :class="[
                'mb-2',
                heading.level === 'h2' ? 'pl-2 text-lg font-bold' : '',
                heading.level === 'h3' ? 'pl-4 text-lg font-bold' : '',
                heading.level === 'h4' ? 'pl-6' : '',
              ]">
              <a
                :href="`#${heading.id}`"
                class="text-gray-600 dark:text-gray-400 hover:underline"
                @click="scrollToHeading(heading.id)"
              >
                {{ heading.text }}
              </a>
            </li>
          </ul>
        </div>
      </nav> -->
</template>

<script setup>

definePageMeta({
  
})

const route = useRoute()
const { data } = await useAsyncData(`content-${route.path}`, () => {
  return queryContent(route.path).findOne()
})

console.log(data?.value.body.children) // 检查文章内容

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Extract headings from content
const headings = computed(() => {
  const content = data.value?.body || {}
  const matches = []

  const extractHeadings = (node) => {
    if (node.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag)) {
      const text = node.props.id || node.children[0].value
      const id = text.toLowerCase().replace(/\s+/g, '-')
      matches.push({ level: node.tag, text, id})
    }
    if (node.children) {
      node.children.forEach(extractHeadings)
    }
  }
  if (content.children) {
    content.children.forEach(extractHeadings)
  }

  console.log('Matched:',matches) // 检查提取的标题
  return matches
})

console.log('Headings:', headings) // 检查提取的标题
const scrollToHeading = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<style>
/* 自定义 prose 样式 */
.prose {
  font-family: 'LXGWWenKai';
  --tw-prose-body: #374151;
  --tw-prose-headings: #111827;
  /* --tw-prose-links: #4264ad; */
  --tw-prose-code: #111827;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: #f7faff;
  --tw-prose-blockquote: #6b7280;
}

.prose h2, h3, h4, h5, h6 {
  color: var(--tw-prose-headings);
  font-weight: 1000;
  font-style: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose p {
  margin: 1.25em 0;
}

.prose p a {
  text-decoration: underline;
}

.prose a {
  text-decoration: none;
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

/* 无序列表 */
.prose ul {
  list-style-type: disc;
  padding: 0 0 0 1.5em;
  margin: 0;
}

.prose ul ul {
  padding-left: 1em;
  margin: 0 0 0 0.75em;
  list-style-type: circle;
}

.prose ul li {
  padding: 0;
  margin: 0.25em 0;
}

.prose li {
  padding: 0.25em 0;
  margin: 0.25em 0 0.25em 0;
}

.prose li li {
  padding: 0;
  margin: 0;
}
</style>