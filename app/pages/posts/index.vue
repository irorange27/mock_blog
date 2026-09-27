<script setup lang="ts">
useSeoMeta({
  title: '全部文章 | Niina\'s Blog',
  description: '全部文章列表。',
})

const { posts } = useBlogData()
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <div class="flex items-baseline justify-between mb-4 sm:mb-6 border-b border-[var(--line-color)] pb-4">
      <h1 class="text-lg font-bold text-[var(--txt-90)]">全部文章</h1>
      <span class="text-sm text-[var(--txt-30)]">共 {{ posts.length }} 篇</span>
    </div>

    <ul class="space-y-0.5">
      <li v-for="post in posts" :key="post.path">
        <NuxtLink
          :to="post.path"
          class="group flex items-baseline gap-3 px-3 py-2 rounded-lg hover:bg-[var(--panel-bg-hover)] transition"
        >
          <span class="text-sm text-[var(--txt-30)] shrink-0 tabular-nums">
            {{ formatDate(post.date) }}
          </span>
          <span class="text-[var(--txt-75)] group-hover:text-[var(--primary)] transition-colors truncate">
            {{ post.title }}
          </span>
          <span class="ml-auto text-xs text-[var(--txt-30)] shrink-0 hidden sm:inline">
            {{ post.categories || '默认' }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
