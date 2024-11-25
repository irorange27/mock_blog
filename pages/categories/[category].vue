<template>
  <div class="bg-white rounded-lg shadow-md p-8">
    <header class="mb-8">
      <h1 class="text-3xl font-bold mb-2">
        分类: {{ route.params.category }}
      </h1>
      <p class="text-gray-600">
        共 {{ route.params.category.count }} 篇文章
      </p>
    </header>

    <div class="space-y-6">
      <article v-for="post in posts" :key="post._path" 
        class="pb-6 border-b last:border-0">
        <NuxtLink :to="post._path">
          <h2 class="text-xl font-bold mb-2 hover:text-blue-600">
            {{ post.title }}
          </h2>
        </NuxtLink>
        
        <div class="flex items-center text-gray-500 text-sm">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-2">·</span>
          <div class="flex gap-2">
            <NuxtLink 
              v-for="tag in post.tags" 
              :key="tag"
              :to="`/tags/${tag}`"
              class="px-2 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
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
const { getPosts } = usePostData()
const posts = ref([])

onMounted(async () => {
  const allPosts = await getPosts()
  posts.value = allPosts.filter(post => post.category === route.params.category)
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script> 