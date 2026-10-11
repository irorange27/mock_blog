<script setup lang="ts">
// 「动态」：最近几条动态的时间线，完整列表在 /moments 页。平铺无卡片容器
// useId：组件可能在移动/桌面两处分支渲染，静态 id 会撞车
const headingId = useId()
</script>

<template>
  <!-- section + aria-labelledby：无障碍树里是一块有名字的「动态」区域，DevTools 里结构一目了然 -->
  <section :aria-labelledby="headingId" class="recent-moments">
    <h2 :id="headingId" class="text-sm font-bold mb-3 text-[var(--txt-90)] border-l-4 border-[var(--line-strong)] pl-2">
      <NuxtLink to="/moments" class="hover:text-[var(--primary)] transition-colors">动态</NuxtLink>
    </h2>

    <!-- 桌面端 5 条；移动端用 CSS 隐藏第 4 条起（数据同源，断点切换无需重新请求） -->
    <div class="[&>ol>li:nth-child(n+4)]:hidden lg:[&>ol>li:nth-child(n+4)]:block">
      <MomentsTimeline :limit="5" />
    </div>

    <NuxtLink
      to="/moments"
      class="block text-xs text-[var(--txt-30)] hover:text-[var(--primary)] transition-colors mt-3"
    >
      查看全部 <span aria-hidden="true">→</span>
    </NuxtLink>
  </section>
</template>
