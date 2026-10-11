<script setup lang="ts">
// 与 CodeRunner 是一对：共用 usePreEnhancer 观察器和 main.css 的 .code-btn 基础样式；
// 有运行键的代码块里本按钮会左移让位（CodeRunner 的 pre[data-runnable] 规则），需同增同删。
usePreEnhancer(() => {
  document.querySelectorAll('pre:not([data-copy-done])').forEach((pre) => {
    pre.setAttribute('data-copy-done', 'true')
    pre.style.position = 'relative'

    const btn = document.createElement('button')
    setButtonIcon(btn, 'mdi:content-copy')
    btn.className = 'code-btn code-copy-btn'
    btn.title = '复制代码'
    btn.setAttribute('aria-label', '复制代码')
    // 读屏播报复制结果（WCAG 4.1.3）：视觉反馈只改图标，这里额外写 role=status 文本
    const status = document.createElement('span')
    status.className = 'sr-only'
    status.setAttribute('role', 'status')
    btn.onclick = async () => {
      const code = pre.querySelector('code')
      if (code) {
        await navigator.clipboard.writeText(code.textContent || '')
        setButtonIcon(btn, 'mdi:check')
        btn.title = '已复制'
        status.textContent = '已复制'
        setTimeout(() => {
          setButtonIcon(btn, 'mdi:content-copy')
          btn.title = '复制代码'
          status.textContent = ''
        }, 2000)
      }
    }
    pre.appendChild(btn)
    pre.appendChild(status)
  })
})
</script>

<template><div /></template>

<style>
/* 基础外观（位置/尺寸/明暗中性色）在 main.css 的 .code-btn，这里只有 hover 前景色 */
.code-copy-btn:hover {
  color: color-mix(in oklab, var(--txt-90) 70%, transparent);
}

html.dark-mode .code-copy-btn:hover {
  color: color-mix(in oklab, var(--txt-90) 80%, transparent);
}
</style>
