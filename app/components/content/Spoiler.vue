<script setup lang="ts">
// 剧透遮罩：原来是纯 CSS hover 揭示，鼠标之外无法交互（WCAG 2.1.1），
// 改为按钮点击/Enter 揭示，键盘聚焦时临时显示，读屏始终可读。
const revealed = ref(false)
</script>

<template>
  <button
    type="button"
    class="spoiler"
    :class="{ revealed }"
    :aria-pressed="revealed"
    :title="revealed ? '点击重新遮住' : '点击揭示剧透'"
    @click="revealed = !revealed"
  >
    <slot>{{ text }}</slot>
  </button>
</template>
