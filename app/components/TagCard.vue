<script setup lang="ts">
const { tags, status, error, refresh } = useBlogData()
</script>

<template>
  <div class="widget-card p-5">
    <h2 class="text-sm font-bold mb-3 text-[var(--txt-90)]">标签</h2>

    <div v-if="status === 'pending'" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--btn-solid-bg)]"></div>
    </div>

    <div v-else-if="error" class="text-[var(--danger)] py-4 text-sm">
      <p>{{ error.message }}</p>
      <button @click="refresh" class="mt-1 underline text-[var(--primary)]">重试</button>
    </div>

    <div v-else class="flex flex-wrap gap-1.5">
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
  </div>
</template>
