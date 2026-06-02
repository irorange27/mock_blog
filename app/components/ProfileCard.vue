<script setup lang="ts">
defineProps<{
  avatar: string
  github?: string
  name: string
  compact?: boolean
}>()
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/60 rounded-2xl" :class="compact ? 'p-3' : 'p-6'">
    <div class="flex items-center gap-3" :class="compact ? '' : 'flex-col space-y-3'">
      <img
        :src="avatar"
        :alt="name"
        class="rounded-full object-cover shrink-0"
        :class="compact ? 'w-9 h-9' : 'w-20 h-20'"
        loading="lazy"
        width="80"
        height="80"
      >
      <h2 class="font-bold dark:text-gray-100 whitespace-nowrap" :class="compact ? 'text-sm' : 'text-base'">
        {{ name }}
      </h2>
      <a
        v-if="github"
        :href="github"
        target="_blank"
        class="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors"
        :class="compact ? 'w-7 h-7' : 'w-9 h-9'"
      >
        <Icon name="mdi:github" class="w-4 h-4" />
      </a>
    </div>
  </div>
</template>
