<script setup lang="ts">
useSeoMeta({
  title: "niina's blog",
  description: "niina's blog homepage。",
})

const currentPage = ref(1)
const postsPerPage = 10

const { posts } = useBlogData()

const totalPages = computed(() => Math.ceil(posts.value.length / postsPerPage))

const currentPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  return posts.value.slice(start, start + postsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="space-y-4">
    <article v-for="post in currentPosts" :key="post._path" 
      class="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-lg p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
      <div>
        <NuxtLink :to="post._path" class="block mb-4">
          <h2 class="text-xl font-bold mb-2 hover:text-blue-500 dark:hover:text-blue-400">
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
              class="px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              {{ tag }}
            </NuxtLink>
          </div>
        </div>

        <div class="text-gray-600 dark:text-gray-400 prose-sm line-clamp-3">
          {{ post.description || post.title }}
        </div>
      </div>
    </article>

    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2 pt-4">
      <button 
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        ← 上一页
      </button>
      
      <template v-for="page in totalPages" :key="page">
        <button 
          v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
          @click="goToPage(page)"
          :class="[
            'px-3 py-2 rounded-lg text-sm font-medium transition-all',
            currentPage === page 
              ? 'bg-blue-400 text-white dark:bg-blue-500' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          {{ page }}
        </button>
        <span 
          v-else-if="Math.abs(page - currentPage) === 2" 
          class="text-gray-400"
        >
          …
        </span>
      </template>
      
      <button 
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        下一页 →
      </button>
    </div>
  </div>
</template>

<style scoped>
.prose-sm {
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
