<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
    <ContentDoc path="/about" class="prose max-w-none dark:text-gray-100 dark:prose-invert" />
  </div>
</template>

<script setup>
useSeoMeta({
  title: '关于我 | Niina\'s Blog',
  description: 'Niina 的个人博客，关于技术、生活和思考。',
})
</script>
