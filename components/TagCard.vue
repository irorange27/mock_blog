<template>
  <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md dark:text-gray-100">
    <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">标签</h2>
    
    <!-- 标签列表 -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
        v-for="tag in tags"
        :key="tag.name"
        @click="selectedTag = tag.name"
        :class="[
          'px-3 py-1 rounded-lg transition',
          selectedTag === tag.name
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 '
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
        ]"
      >
        {{ tag.name }}
        <!-- <span class="text-sm ml-1">({{ tag.count }})</span> -->
      </button>
    </div>

    <!-- 选中标签的文章列表
    <div v-if="selectedTag" class="space-y-3">
      <h3 class="font-semibold text-lg mb-2">
        {{ selectedTag }} 的文章
      </h3>
      <ul class="space-y-2">
        <li v-for="post in selectedTagPosts" :key="post._path">
          <NuxtLink 
            :to="post._path"
            class="text-gray-700 hover:text-blue-600 line-clamp-1"
          >
            {{ post.title }}
          </NuxtLink>
        </li>
      </ul>
    </div> -->
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

const { getTags } = usePostData()

const tags = ref([])

onMounted(async () => {
  tags.value = await getTags()
})
</script> 