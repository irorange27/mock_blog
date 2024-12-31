<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 ">
        <h2 class="text-2xl dark:text-gray-100 font-bold mb-4 border-l-4 border-blue-200 pl-2">分类</h2>
        <div>
          <NuxtLink
            v-for="category in categories"
            :key="category.name"
            :to="`/categories/${category.name}`"
            class="flex items-center justify-between w-full p-4 rounded-lg dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <span class="font-medium">{{ category.name }}</span>
            <span class="text-gray-500 dark:text-gray-400 rounded-lg bg-blue">{{ category.count }}</span>
          </NuxtLink>
        </div>
    </div> 
</template>

<script setup>
const posts = ref([])

// 获取文章列表
const { data } = await useAsyncData('posts-list', () => 
  queryContent('posts')
    .sort({ date: -1 }) // 按日期降序排序
    .where({ _partial: false }) // 排除部分内容
    .find()
)

posts.value = data.value

const { getCategories } = usePostData()
const categories = ref([])

onMounted(async () => {
  categories.value = await getCategories()

})
</script>