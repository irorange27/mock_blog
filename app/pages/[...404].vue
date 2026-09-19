<script setup lang="ts">
useSeoMeta({
  title: '404 | Niina\'s Blog',
})

definePageMeta({
    layout: '404'
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="card-base p-8 text-center">
      <h1 class="text-6xl font-bold text-[var(--danger)] mb-4">404</h1>
      <p class="text-xl text-[var(--txt-75)] mb-6">Page Not Found</p>
      <NuxtLink to="/" class="inline-block px-6 py-3 text-[var(--btn-solid-fg)] rounded-lg bg-[var(--btn-solid-bg)] hover:bg-[var(--btn-solid-bg-hover)] transition-colors">
        返回首页
      </NuxtLink>
    </div>
  </div>
</template>
