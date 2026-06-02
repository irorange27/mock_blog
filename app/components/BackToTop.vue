<script setup lang="ts">
const visible = ref(false)

const onScroll = () => {
  visible.value = window.scrollY > 400
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <button
    v-show="visible"
    class="fixed bottom-6 sm:bottom-8 right-4 sm:right-8 z-40 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 shadow-md transition-all"
    @click="scrollToTop"
    aria-label="返回顶部"
  >
    <Icon name="mdi:chevron-up" class="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
  </button>
</template>
