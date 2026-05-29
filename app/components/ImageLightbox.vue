<script setup lang="ts">
import VueEasyLightbox from 'vue-easy-lightbox'

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

onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG' && target.closest('.prose')) {
      e.preventDefault()
      showLightbox((target as HTMLImageElement).src)
    }
  })
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
