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
  <div class="space-y-5">
    <article v-for="post in currentPosts" :key="post._path" 
      class="bg-white dark:bg-gray-800 dark:text-gray-100 rounded-lg p-7 border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-0.5 transition-all duration-200">
      <div>
        <NuxtLink :to="post._path" class="block mb-3">
          <h2 class="text-xl font-bold mb-2 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex flex-wrap items-center text-gray-400 dark:text-gray-500 text-sm mb-3">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-1.5">·</span>
          <div class="flex flex-wrap gap-1.5">
            <NuxtLink 
              v-for="tag in post.tags" 
              :key="tag"
              :to="`/tags/${tag}`"
              class="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 text-xs rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              {{ tag }}
            </NuxtLink>
          </div>
        </div>

        <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
          {{ post.description || post.title }}
        </p>
      </div>
    </article>

    <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 pt-6">
      <button 
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        ← 上一页
      </button>
      
      <template v-for="page in totalPages" :key="page">
        <button 
          v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
          @click="goToPage(page)"
          :class="[
            'w-8 h-8 rounded-lg text-sm transition-all',
            currentPage === page 
              ? 'bg-blue-400 text-white' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          ]"
        >
          {{ page }}
        </button>
        <span 
          v-else-if="Math.abs(page - currentPage) === 2" 
          class="text-gray-300 dark:text-gray-600"
        >
          …
        </span>
      </template>
      
      <button 
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        下一页 →
      </button>
    </div>
  </div>
</template>
