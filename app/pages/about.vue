<script setup lang="ts">
useSeoMeta({
  title: '关于我 | Niina\'s Blog',
  description: 'Niina 的个人博客，关于技术、生活和思考。',
})

const { data: page } = await useAsyncData('about-page', () =>
  queryCollection('about').path('/about').first()
)
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <ContentRenderer v-if="page" :value="page" class="prose max-w-none" />
  </div>
</template>
