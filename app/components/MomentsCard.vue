<script setup lang="ts">
// 侧栏「动态」：最近几条动态的时间线，完整列表在 /moments 页
</script>

<template>
  <!-- section + aria-labelledby：无障碍树里是一块有名字的「动态」区域，DevTools 里结构一目了然 -->
  <section aria-labelledby="moments-heading" class="widget-card p-5">
    <h2 id="moments-heading" class="text-sm font-bold mb-3 text-[var(--txt-90)]">
      <NuxtLink to="/moments" class="hover:text-[var(--primary)] transition-colors">动态</NuxtLink>
    </h2>

    <MomentsTimeline :limit="5" />

    <NuxtLink
      to="/moments"
      class="block text-xs text-[var(--txt-30)] hover:text-[var(--primary)] transition-colors mt-3"
    >
      查看全部 →
    </NuxtLink>
  </section>
</template>
