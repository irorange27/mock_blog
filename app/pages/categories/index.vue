<script setup lang="ts">
useSeoMeta({
  title: '分类与标签 | Niina\'s Blog',
  description: '所有文章分类和标签。',
})

const { categories, tags } = useBlogData()
</script>

<template>
  <div class="space-y-4 sm:space-y-8">
    <div class="card-base p-4 sm:p-8">
      <h2 class="text-2xl font-bold mb-6 text-[var(--txt-90)]">分类</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="category in categories"
          :key="category.name"
          :to="`/categories/${category.name}`"
          class="flex items-center justify-between p-4 bg-[var(--panel-bg)] rounded-lg hover:bg-[var(--panel-bg-hover)] transition"
        >
          <span class="font-medium text-[var(--txt-90)] truncate">{{ category.name }}</span>
          <span class="text-[var(--txt-50)] shrink-0">{{ category.count }} 篇</span>
        </NuxtLink>
      </div>
    </div>

    <div class="card-base p-4 sm:p-8">
      <h2 class="text-2xl font-bold mb-6 text-[var(--txt-90)]">标签</h2>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          v-for="tag in tags"
          :key="tag.name"
          :to="`/tags/${tag.name}`"
          class="px-4 py-2 bg-[var(--panel-bg)] rounded-full hover:bg-[var(--panel-bg-hover)] transition"
        >
          <span class="text-[var(--txt-90)]">{{ tag.name }}</span>
          <span class="text-[var(--txt-50)] text-sm ml-1">({{ tag.count }})</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
