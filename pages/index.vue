<template>

  <!-- 文章列表 -->
  <div class="space-y-6">
    <article v-for="post in currentPosts" :key="post._path" 
      class="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div>
        <NuxtLink :to="post._path" class="block mb-4">
          <h2 class="text-2xl font-bold mb-2 hover:text-blue-600 dark:hover:text-blue-400">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex flex-wrap items-center text-gray-500 dark:text-gray-400 text-sm mb-4">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <div class="flex flex-wrap gap-2">
            <NuxtLink 
              v-for="tag in post.tags" 
              :key="tag"
              :to="`/tags/${tag}`"
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {{ tag }}
            </NuxtLink>
          </div>
        </div>

        <div class="text-gray-600 dark:text-gray-400 prose-sm line-clamp-3">
          {{ post.description || post.excerpt }}
        </div>
      </div>
    </article>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex justify-center space-x-2 mt-8">
      <button 
        v-for="page in totalPages" 
        :key="page"
        @click="currentPage = page"
        :class="[
          'px-4 py-2 rounded-lg',
          currentPage === page 
            ? 'bg-blue-300 text-white dark:bg-blue-500' 
            : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
        ]"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script setup>
useSeoMeta({
  title: 'Home',
  description: 'Home page description'
})

const currentPage = ref(1)
const postsPerPage = 10
const posts = ref([])
const totalPages = ref(1)

// 获取文章列表
const { data } = await useAsyncData('posts-list', () => 
  queryContent('posts')
    .sort({ date: -1 }) // 按日期降序排序
    .where({ _partial: false }) // 排除部分内容
    .find()
)

posts.value = data.value
totalPages.value = Math.ceil(posts.value.length / postsPerPage)

// 计算当前页面显示的文章
const currentPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  const end = start + postsPerPage
  return posts.value.slice(start, end)
})

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.prose-sm {
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>