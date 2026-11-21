<script setup lang="ts">
// 本地预览草稿的入口。线上不存在这个页面：nav 里的入口被 import.meta.env.DEV 关掉，
// 没有页面链到 /drafts，nuxt generate 也就不会生成它。
useSeoMeta({
  title: '草稿 | Niina\'s Blog',
  robots: 'noindex',
})

const { drafts } = useBlogData()
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <div class="flex items-baseline justify-between mb-4 sm:mb-6 border-b border-[var(--line-color)] pb-4">
      <h1 class="text-lg font-bold text-[var(--txt-90)]">草稿</h1>
      <span class="text-sm text-[var(--txt-30)]">共 {{ drafts.length }} 篇</span>
    </div>

    <p v-if="!drafts.length" class="text-sm text-[var(--txt-30)]">
      content/posts/ 下没有 draft: true 的文章。
    </p>

    <ul v-else class="space-y-0.5">
      <li v-for="post in drafts" :key="post.path">
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
