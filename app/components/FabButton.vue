<script setup lang="ts">
// BackToTop / TableOfContents 共用的右下角悬浮圆钮：外观在这里，
// fixed 定位（bottom/right）由外层 wrapper 决定；额外属性（aria-expanded、click）自动透传
defineProps<{ label: string }>()
</script>

<template>
  <button
    class="z-40 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-[var(--card-bg-80)] backdrop-blur border border-[var(--line-color)] text-[var(--txt-30)] hover:text-[var(--primary)] hover:border-[var(--line-strong)] shadow-md transition-all flex items-center justify-center"
    :aria-label="label"
  >
    <slot />
  </button>
</template>
