<script setup lang="ts">
defineProps<{
  avatar: string
  github?: string
  name: string
  compact?: boolean
}>()
</script>

<template>
  <!-- 平铺无卡片：单行排布（头像 + 名字 + GitHub），信息密度优先 -->
  <div class="author-profile flex items-center gap-3" :class="compact ? '' : 'py-1'">
    <img
      :src="avatar"
      :alt="name"
      class="rounded-full object-cover shrink-0 ring-1 ring-[var(--line-color)]"
      :class="compact ? 'w-9 h-9' : 'w-12 h-12'"
      loading="lazy"
      width="80"
      height="80"
    >
    <div class="min-w-0">
      <h2 class="text-sm font-bold text-[var(--txt-90)] whitespace-nowrap leading-tight">
        {{ name }}
      </h2>
      <a
        v-if="github"
        :href="github"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-[var(--txt-30)] hover:text-[var(--primary)] transition-colors mt-0.5"
        aria-label="GitHub（新窗口打开）"
      >
        <Icon name="mdi:github" class="w-3.5 h-3.5" aria-hidden="true" />
        <span class="truncate">{{ github.replace('https://github.com/', '') }}</span>
      </a>
    </div>
  </div>
</template>
