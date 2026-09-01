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

    <div v-if="status === 'pending'" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--btn-solid-bg)]"></div>
    </div>

    <div v-else-if="error" class="text-[var(--danger)] text-center py-8">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="mt-2 px-4 py-2 bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)] rounded hover:bg-[var(--btn-solid-bg-hover)]">
        重试
      </button>
    </div>

    <div v-else-if="Object.keys(groupedPosts).length > 0" class="space-y-4 sm:space-y-8">
      <div v-for="(months, year) in groupedPosts" :key="year">
        <h2 class="text-lg font-bold text-[var(--txt-90)] mb-4 border-l-4 border-[var(--line-strong)] pl-2">
          {{ year }}
        </h2>

        <div class="space-y-4 sm:space-y-6 ml-2 sm:ml-4">
          <div v-for="(postsByMonth, month) in months" :key="month">
            <h3 class="text-lg font-semibold mb-2 text-[var(--txt-75)]">
              {{ month }} 月
            </h3>
            <ul class="space-y-2 ml-4">
              <li
                v-for="post in postsByMonth"
                :key="post._path"
                class="hover:bg-[var(--panel-bg-hover)] rounded-md transition"
              >
                <NuxtLink
                  :to="post._path"
                  class="flex items-center justify-between space-x-4 p-2"
                >
                  <span class="text-[var(--txt-50)] text-sm">
                    {{ formatDay(post.date) }}
                  </span>
                  <span class="font-medium font-bold text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors">
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
  </div>
</template>
