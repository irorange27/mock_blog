<script setup lang="ts">
const { categories, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="widget-card p-5">
    <h2 class="text-sm font-bold mb-3 text-[var(--txt-90)]">分类</h2>

    <DataState :status="status" :error="error" @retry="refresh">
      <NuxtLink
        v-for="category in categories"
        :key="category.name"
        :to="`/categories/${category.name}`"
        class="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[var(--txt-90)] hover:bg-[var(--panel-bg-hover)] transition-colors text-sm"
      >
        <span>{{ category.name }}</span>
        <span class="chip text-xs px-2 py-0.5 rounded-md">
          {{ category.count }}
        </span>
      </NuxtLink>

      <div v-if="categories.length === 0" class="text-[var(--txt-30)] text-center py-4 text-sm">
        暂无分类
      </div>
    </DataState>
  </div>
</template>
