<script setup lang="ts">
useSeoMeta({
  title: '404 | Niina\'s Blog',
})

definePageMeta({
    layout: '404'
})
</script>

<template>
  <main class="min-h-screen flex items-center justify-center">
    <div class="card-base p-8 text-center">
      <p class="text-6xl font-bold text-[var(--danger)] mb-4" aria-hidden="true">404</p>
      <h1 class="text-xl text-[var(--txt-75)] mb-6">页面未找到</h1>
      <NuxtLink to="/" class="inline-block px-6 py-3 text-[var(--btn-solid-fg)] rounded-lg bg-[var(--btn-solid-bg)] hover:bg-[var(--btn-solid-bg-hover)] transition-colors">
        返回首页
      </NuxtLink>
    </div>
  </main>
</template>
