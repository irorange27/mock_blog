<script setup lang="ts">
useSeoMeta({
  title: '归档 | Niina\'s Blog',
  description: '所有文章按时间归档。',
})

import type { Post } from '~/types/post'

const { posts, status, error, refresh } = useBlogData()

// 只按年分组，不单独强调月份；条目日期显示“M月D日”
const groupedPosts = computed(() => {
  const groups: { year: string; posts: Post[] }[] = []
  for (const post of posts.value) {
    const year = new Date(post.date).getFullYear().toString()
    let g = groups.find(x => x.year === year)
    if (!g) {
      g = { year, posts: [] }
      groups.push(g)
    }
    g.posts.push(post)
  }
  return groups
})

const formatMonthDay = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <h1 class="text-lg font-bold text-[var(--txt-90)] mb-4 sm:mb-8 border-b border-[var(--line-color)] pb-4">归档</h1>

    <DataState :status="status" :error="error" large @retry="refresh">
      <div v-if="Object.keys(groupedPosts).length > 0" class="space-y-4 sm:space-y-8">
      <div v-for="yearGroup in groupedPosts" :key="yearGroup.year">
        <h2 class="text-lg font-bold text-[var(--txt-90)] mb-4 border-l-4 border-[var(--line-strong)] pl-2">
          {{ yearGroup.year }}
        </h2>

        <ul class="space-y-2 ml-2 sm:ml-4">
          <li
            v-for="post in yearGroup.posts"
            :key="post.path"
            class="hover:bg-[var(--panel-bg-hover)] rounded-md transition"
          >
            <NuxtLink
              :to="post.path"
              class="flex items-center justify-between space-x-4 p-2"
            >
              <span class="text-[var(--txt-50)] text-sm shrink-0">
                {{ formatMonthDay(post.date) }}
              </span>
              <span class="font-medium font-bold text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors truncate">
                {{ post.title }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="text-[var(--txt-50)] text-center py-8">
      暂无文章
    </div>
    </DataState>
  </div>
</template>
