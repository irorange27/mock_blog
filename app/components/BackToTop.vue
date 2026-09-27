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
  <div v-show="visible" class="fixed bottom-6 sm:bottom-8 right-4 sm:right-8">
    <FabButton label="返回顶部" @click="scrollToTop">
      <Icon name="mdi:chevron-up" class="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
    </FabButton>
  </div>
</template>
