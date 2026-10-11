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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}
</script>

<template>
  <div v-show="visible" class="back-to-top fixed bottom-6 sm:bottom-8 right-4 sm:right-8">
    <FloatingButton label="返回顶部" @click="scrollToTop">
      <Icon name="mdi:chevron-up" class="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
    </FloatingButton>
  </div>
</template>
