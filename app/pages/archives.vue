<script setup lang="ts">
useSeoMeta({
  title: '归档 | Niina\'s Blog',
  description: '所有文章按时间归档。',
})

const { posts, status, error, refresh } = useBlogData()

const groupedPosts = computed(() => groupPostsByYearAndMonth(posts.value))
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

        <div class="space-y-4 sm:space-y-6 ml-2 sm:ml-4">
          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month">
            <h3 class="text-lg font-semibold mb-2 text-[var(--txt-75)]">
              {{ monthGroup.month }} 月
            </h3>
            <ul class="space-y-2 ml-4">
              <li
                v-for="post in monthGroup.posts"
                :key="post.path"
                class="hover:bg-[var(--panel-bg-hover)] rounded-md transition"
              >
                <NuxtLink
                  :to="post.path"
                  class="flex items-center justify-between space-x-4 p-2"
                >
                  <span class="text-[var(--txt-50)] text-sm shrink-0">
                    {{ formatDay(post.date) }}
                  </span>
                  <span class="font-medium font-bold text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors truncate">
                    {{ post.title }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-[var(--txt-50)] text-center py-8">
      暂无文章
    </div>
    </DataState>
  </div>
</template>
