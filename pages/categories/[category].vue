<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <header class="mb-8">
      <h1 class="text-3xl font-bold mb-2 dark:text-gray-100">
        分类: {{ route.params.category }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        共 {{ categoryCount }} 篇文章
      </p>
    </header>

    <div class="space-y-6">
      <article v-for="post in posts" :key="post._path" 
        class="pb-6 border-b last:border-0">
        <NuxtLink :to="post._path">
          <h2 class="text-xl font-bold dark:text-gray-100 mb-2 hover:text-blue-600 dark:hover:text-blue-400">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <div class="flex gap-2">
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
      </article>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const { getPosts, getCategories } = usePostData()
const posts = ref([])
const categoryCount = ref(0)

onMounted(async () => {
  const allPosts = await getPosts()
  posts.value = allPosts.filter(post => post.categories === route.params.category)
  const categories = await getCategories()
  const category = categories.find(c => c.name === route.params.category)
  categoryCount.value = category.count
})



const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script> 