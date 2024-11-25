<template>
  <div class="bg-white rounded-lg shadow-md p-8">
    <h1 class="text-3xl font-bold mb-8 border-b pb-4">归档</h1>
    
    <div class="space-y-8">
      <div v-for="(posts, year) in groupedPosts" :key="year">
        <!-- 年份标题 -->
        <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">
          {{ year }}
        </h2>
        
        <div class="space-y-6 ml-4">
          <div v-for="(postsByMonth, month) in posts" :key="month">
            <!-- 月份标题 -->
            <h3 class="text-xl font-semibold mb-2 text-gray-700">
              {{ month }}月
            </h3>
            <ul class="space-y-2 ml-4">
              <li 
                v-for="post in postsByMonth" 
                :key="post._path" 
                class="hover:bg-gray-50 rounded-md transition"
              >
                <NuxtLink 
                  :to="post._path"
                  class="flex items-center justify-between space-x-4 p-2"
                >
                  <span class="text-gray-500 text-sm">
                    {{ formatDay(post.date) }}
                  </span>
                  <span class="font-medium font-bold text-gray-800 hover:text-blue-600">
                    {{ post.title }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
const { getPosts } = usePostData()
const posts = ref([])
const groupedPosts = ref({})

onMounted(async () => {
  posts.value = await getPosts()
  console.log('Posts:', posts.value)
  groupedPosts.value = groupPostsByYearAndMonth(posts.value)
})

const formatDay = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    day: 'numeric'
  })
}

const groupPostsByYearAndMonth = (posts) => {
  return posts.reduce((acc, post) => {
    const date = new Date(post.date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    if (!acc[year]) {
      acc[year] = {}
    }
    if (!acc[year][month]) {
      acc[year][month] = []
    }
    acc[year][month].push(post)
    return acc
  }, {})
}
</script>