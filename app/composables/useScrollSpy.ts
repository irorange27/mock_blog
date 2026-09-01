/**
 * 滚动监听：返回当前阅读位置对应的标题 id。
 * 「当前」= 视口顶部 offset 之上最后一个标题（即该标题所在的段落正在阅读）。
 * 滚动到页面底部时强制落在最后一个标题上。
 */
export function useScrollSpy(getIds: () => string[], offset = 96) {
  const activeId = ref<string | null>(null)
  let raf = 0

  const update = () => {
    raf = 0
    const els = getIds()
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
    if (!els.length) {
      activeId.value = null
      return
    }

    let current = els[0].id
    for (const el of els) {
      if (el.getBoundingClientRect().top <= offset) current = el.id
    }

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = els[els.length - 1].id
    }
    activeId.value = current
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update)
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
  })

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  })

  return { activeId }
}
