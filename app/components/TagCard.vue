<script setup lang="ts">
const { tags, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="widget-card p-5">
    <h2 class="text-sm font-bold mb-3 text-[var(--txt-90)]">标签</h2>

    <DataState :status="status" :error="error" @retry="refresh">
      <div class="flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="tag in tags"
          :key="tag.name"
          :to="`/tags/${tag.name}`"
          class="chip px-2.5 py-1 text-xs rounded-lg"
        >
          {{ tag.name }}
          <span class="ml-0.5 opacity-50">{{ tag.count }}</span>
        </NuxtLink>

        <div v-if="tags.length === 0" class="text-[var(--txt-30)] text-center py-4 w-full text-sm">
          暂无标签
        </div>
      </div>
    </DataState>
  </div>
</template>
