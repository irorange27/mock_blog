<template>
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-4">归档</h2>
    <div class="space-y-4">
      <div v-for="(posts, year) in archives" :key="year" class="space-y-2">
        <h3 class="text-xl font-semibold">{{ year }}</h3>
        <ul class="space-y-2">
          <li v-for="post in posts" :key="post._path" class="hover:text-blue-600">
            <NuxtLink :to="post._path" class="flex justify-between">
              <span>{{ post.title }}</span>
              <span class="text-gray-500">{{ formatDate(post.date) }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const archives = ref({})

onMounted(async () => {
  tags.value = await getTags()
})
</script> 