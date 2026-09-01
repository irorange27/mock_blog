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
  <article class="card-base p-4 sm:p-8 max-w-full">
    <header class="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-[var(--line-color)]">
      <h1 class="text-2xl text-[var(--txt-90)] font-bold mb-4">{{ data?.title }}</h1>
      <div class="flex items-center text-[var(--txt-50)] text-sm">
        <span>{{ formatDate(data?.date) }}</span>
        <span class="mx-2">·</span>
        <NuxtLink
          :to="`/categories/${data?.categories || '默认'}`"
          class="hover:text-[var(--primary)] transition-colors"
        >
          {{ data?.categories || '默认' }}
        </NuxtLink>
        <span class="mx-2">·</span>
        <div class="flex gap-2">
          <NuxtLink
            v-for="tag in data?.tags"
            :key="tag"
            :to="`/tags/${tag}`"
            class="chip px-2.5 py-0.5 text-xs rounded-full"
          >
            {{ tag }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <TableOfContents v-if="data?.body?.toc?.links?.length" :toc="data.body.toc.links" />

    <div class="prose max-w-4xl">
      <ContentRenderer v-if="data" :value="data" />
    </div>

    <nav v-if="adjacent.prev || adjacent.next" class="mt-10 pt-6 border-t border-[var(--line-color)] grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-if="adjacent.prev"
        :to="adjacent.prev._path"
        class="group p-4 rounded-lg border border-[var(--line-color)] hover:border-[var(--line-strong)] transition-colors"
      >
        <span class="text-xs text-[var(--txt-30)]">← 上一篇</span>
        <p class="mt-1 text-sm font-medium text-[var(--txt-75)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
          {{ adjacent.prev.title }}
        </p>
      </NuxtLink>
      <NuxtLink
        v-if="adjacent.next"
        :to="adjacent.next._path"
        class="group p-4 rounded-lg border border-[var(--line-color)] hover:border-[var(--line-strong)] transition-colors sm:text-right"
      >
        <span class="text-xs text-[var(--txt-30)]">下一篇 →</span>
        <p class="mt-1 text-sm font-medium text-[var(--txt-75)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
          {{ adjacent.next.title }}
        </p>
      </NuxtLink>
    </nav>
  </article>
</template>
