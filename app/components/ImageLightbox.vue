<script setup lang="ts">
// vue-easy-lightbox 只在点图时才需要：异步组件避免它的 chunk 进首屏 JS
import { defineAsyncComponent } from 'vue'

const VueEasyLightbox = defineAsyncComponent(() => import('vue-easy-lightbox'))

const visible = ref(false)
const imgs = ref<string[]>([])
const index = ref(0)

const showLightbox = (src: string) => {
  imgs.value = [src]
  index.value = 0
  visible.value = true
}

const onHide = () => {
  visible.value = false
}

const onClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  // 图片包在链接里时放行跳转，不抢点击
  if (target.tagName === 'IMG' && target.closest('.prose') && !target.closest('a')) {
    e.preventDefault()
    showLightbox((target as HTMLImageElement).src)
  }
}

onMounted(() => {
  document.addEventListener('click', onClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onClick)
})
</script>

<template>
  <VueEasyLightbox
    :visible="visible"
    :imgs="imgs"
    :index="index"
    @hide="onHide"
  />
</template>
