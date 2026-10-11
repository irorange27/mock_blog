/**
 * 渲染后 DOM 增强的共享观察器（CodeCopy / CodeRunner / ImageLightbox 用）。
 * 监听 body 子树，只在新增节点里真的出现目标元素时才调用 enhance——
 * 避免每次无关 mutation 都全文档 querySelectorAll。
 */
export function usePreEnhancer(
  enhance: () => void,
  hasTarget: (el: Element) => boolean = el =>
    el.tagName === 'PRE' || el.querySelector('pre') !== null,
) {
  onMounted(() => {
    enhance()

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && hasTarget(node as Element)) {
            enhance()
            return
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    onUnmounted(() => observer.disconnect())
  })
}
