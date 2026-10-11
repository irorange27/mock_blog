<script setup lang="ts">
import type { FriendLink } from '~/types/post'

defineProps<{
  link: FriendLink
}>()

const avatarError = ref(false)
</script>

<template>
  <!-- article：DevTools / 读屏里这是一个独立的友链条目 -->
  <article class="friend-link-item flex items-center p-4 border border-[var(--line-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow">
    <!-- 头像链接与下方名字链接指向同一 URL，对读屏是重复停顿点：
         aria-hidden + tabindex="-1" 让它只对鼠标/视觉有意义 -->
    <a :href="link.url" target="_blank" rel="noopener noreferrer" aria-hidden="true" tabindex="-1">
      <img
        v-if="!avatarError"
        :src="link.avatar"
        alt=""
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
  </article>
</template>
