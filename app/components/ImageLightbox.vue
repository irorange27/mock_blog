<script setup lang="ts">
// vue-easy-lightbox 只在点图时才需要：异步组件避免它的 chunk 进首屏 JS
import { defineAsyncComponent } from 'vue'

const VueEasyLightbox = defineAsyncComponent(() => import('vue-easy-lightbox'))

const visible = ref(false)
const imgs = ref<string[]>([])
const index = ref(0)

const lightboxDarkInkClass = 'lightbox-dark-ink'
let lastTrigger: HTMLElement | null = null

const showLightbox = (src: string, isDarkInk: boolean, trigger?: HTMLElement | null) => {
  imgs.value = [src]
  index.value = 0
  lastTrigger = trigger ?? (document.activeElement as HTMLElement | null)
  document.documentElement.classList.toggle(lightboxDarkInkClass, isDarkInk)
  visible.value = true
}

const onHide = () => {
  visible.value = false
  document.documentElement.classList.remove(lightboxDarkInkClass)
  // 关闭后焦点回触发元素（WCAG 2.4.3）
  lastTrigger?.focus()
  lastTrigger = null
}

const onClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  // 图片包在链接里时放行跳转，不抢点击
  if (target.tagName === 'IMG' && target.closest('.prose') && !target.closest('a')) {
    e.preventDefault()
    const image = target as HTMLImageElement
    showLightbox(image.src, image.classList.contains('dark-ink'), image)
  }
}

// 键盘可用（WCAG 2.1.1）：prose 内独立图片设为可聚焦的 button 角色，Enter/Space 打开灯箱
const enhanceImages = () => {
  document.querySelectorAll('.prose img:not([data-lightbox-done])').forEach((img) => {
    const image = img as HTMLImageElement
    image.setAttribute('data-lightbox-done', 'true')
    if (image.closest('a')) return
    image.tabIndex = 0
    image.setAttribute('role', 'button')
    image.setAttribute('aria-label', `放大查看${image.alt ? `：${image.alt}` : '图片'}`)
    image.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        showLightbox(image.src, image.classList.contains('dark-ink'), image)
      }
    })
  })
}

usePreEnhancer(enhanceImages, el => el.tagName === 'IMG' || el.querySelector('img') !== null)

onMounted(() => {
  document.addEventListener('click', onClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onClick)
  document.documentElement.classList.remove(lightboxDarkInkClass)
})
</script>

<template>
  <VueEasyLightbox
    class="image-lightbox"
    :visible="visible"
    :imgs="imgs"
    :index="index"
    @hide="onHide"
  />
</template>
