/**
 * 渲染后 DOM 增强的共享观察器（CodeCopy / CodeRunner 用）。
 * 监听 body 子树，只在新增节点里真的出现 <pre> 时才调用 enhance——
 * 避免每次无关 mutation 都全文档 querySelectorAll。
 */
export function usePreEnhancer(enhance: () => void) {
  onMounted(() => {
    enhance()

    const hasPre = (el: Element): boolean =>
      el.tagName === 'PRE' || el.querySelector('pre') !== null

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && hasPre(node as Element)) {
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
