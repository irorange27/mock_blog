<script setup lang="ts">
import type { FriendLink } from '~/types/post'

defineProps<{
  link: FriendLink
}>()

const avatarError = ref(false)
</script>

<template>
  <div class="flex items-center p-4 border border-[var(--line-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <a :href="link.url" target="_blank" rel="noopener noreferrer">
      <img
        v-if="!avatarError"
        :src="link.avatar"
        :alt="link.name"
        class="w-16 h-16 rounded-full object-cover mr-4 border-2 border-[var(--line-color)] hover:border-[var(--primary)] transition-colors"
        loading="lazy"
        width="64"
        height="64"
        @error="avatarError = true"
      >
      <div
        v-else
        class="w-16 h-16 rounded-full mr-4 border-2 border-[var(--line-color)] bg-[var(--panel-bg-hover)] flex items-center justify-center text-[var(--txt-50)] text-xl font-bold"
      >
        {{ link.name.charAt(0) }}
      </div>
    </a>
    <div class="flex-1">
      <a
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="text-lg font-semibold text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors"
      >
        {{ link.name }}
      </a>
      <p class="mt-1 text-sm text-[var(--txt-50)]">
        {{ link.description }}
      </p>
    </div>
  </div>
</template>
