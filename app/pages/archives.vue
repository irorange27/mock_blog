<script setup lang="ts">
useSeoMeta({
  title: '归档 | Niina\'s Blog',
  description: '所有文章按时间归档。',
})

const { posts, status, error, refresh } = useBlogData()

const groupedPosts = computed(() => groupPostsByYearAndMonth(posts.value))
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-8">
    <h1 class="text-lg font-bold dark:text-gray-100 mb-8 border-b pb-4">归档</h1>
    
    <div v-if="status === 'pending'" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
    </div>
    
    <div v-else-if="error" class="text-red-500 text-center py-8">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="mt-2 px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500">
        重试
      </button>
    </div>
    
    <div v-else-if="Object.keys(groupedPosts).length > 0" class="space-y-8">
      <div v-for="(months, year) in groupedPosts" :key="year">
        <h2 class="text-lg font-bold dark:text-gray-100 mb-4 border-l-4 border-blue-200 dark:border-blue-400 pl-2">
          {{ year }}
        </h2>
        
        <div class="space-y-6 ml-4">
          <div v-for="(postsByMonth, month) in months" :key="month">
            <h3 class="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-100">
              {{ month }} 月
            </h3>
            <ul class="space-y-2 ml-4">
              <li 
                v-for="post in postsByMonth" 
                :key="post._path" 
                class="hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition"
              >
                <NuxtLink 
                  :to="post._path"
                  class="flex items-center justify-between space-x-4 p-2"
                >
                  <span class="text-gray-500 text-sm dark:text-gray-400">
                    {{ formatDay(post.date) }}
                  </span>
                  <span class="font-medium font-bold text-gray-800 dark:text-gray-100 hover:text-blue-500 dark:hover:text-blue-400">
                    {{ post.title }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-gray-500 dark:text-gray-400 text-center py-8">
      暂无文章
    </div>
  </div>
</template>
