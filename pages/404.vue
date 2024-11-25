<script setup lang="ts">
definePageMeta({
    layout: '404'
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md text-center">
      <h1 class="text-6xl font-bold text-red-600 mb-4">404</h1>
      <p class="text-xl text-gray-700 mb-6">Page Not Found</p>
      <NuxtLink to="/" class="inline-block px-6 py-3 text-white rounded-lg hover:bg-blue-700 transition-colors">
        返回首页
      </NuxtLink>
    </div>
  </div>
</template>


