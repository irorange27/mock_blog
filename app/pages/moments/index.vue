<script setup lang="ts">
useSeoMeta({
  title: '动态 | Niina\'s Blog',
  description: '碎碎念与短记录，按时间排列。',
})
</script>

<template>
  <div class="card-base p-4 sm:p-8">
    <h1 class="text-lg font-bold text-[var(--txt-90)] mb-4 sm:mb-8 border-b border-[var(--line-color)] pb-4">动态</h1>

    <MomentsTimeline />
  </div>
</template>
