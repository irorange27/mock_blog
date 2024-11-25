<template>
    <div class="bg-white rounded-lg shadow-md p-8">
        <h2 class="text-2xl font-bold mb-4 border-l-4 border-blue-200 pl-2">分类</h2>
        <div>
          <NuxtLink
            v-for="category in categories"
            :key="category.name"
            :to="`/categories/${category.name}`"
            class="flex items-center justify-between w-full p-4 rounded-lg hover:bg-gray-100 transition"
          >
            <span class="font-medium">{{ category.name }}</span>
            <span class="text-gray-500 rounded-lg bg-blue">{{ category.count }}</span>
          </NuxtLink>
        </div>
    </div> 
</template>

<script setup>
const { getCategories} = usePostData()
const categories = ref([])

onMounted(async () => {
  categories.value = await getCategories()

})
</script>