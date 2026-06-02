<script setup lang="ts">
onMounted(() => {
  const addCopyButtons = () => {
    document.querySelectorAll('pre:not([data-copy-done])').forEach((pre) => {
      pre.setAttribute('data-copy-done', 'true')
      pre.style.position = 'relative'
      
      const btn = document.createElement('button')
      btn.textContent = '复制'
      btn.className = 'code-copy-btn'
      btn.onclick = async () => {
        const code = pre.querySelector('code')
        if (code) {
          await navigator.clipboard.writeText(code.textContent || '')
          btn.textContent = '已复制'
          setTimeout(() => { btn.textContent = '复制' }, 2000)
        }
      }
      pre.appendChild(btn)
    })
  }

  addCopyButtons()
  const observer = new MutationObserver(addCopyButtons)
  observer.observe(document.body, { childList: true, subtree: true })
  onUnmounted(() => observer.disconnect())
})
</script>

<template><div /></template>

<style>
.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

/* Dark mode code blocks (github-dark bg: #0d1117) */
pre:hover .code-copy-btn {
  opacity: 1;
}

html.dark-mode .code-copy-btn {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.1);
}

html.dark-mode .code-copy-btn:hover {
  background: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.8);
}

/* Light mode code blocks (github-light bg: #f7faff) */
html:not(.dark-mode) .code-copy-btn {
  background: rgba(0,0,0,0.06);
  color: rgba(0,0,0,0.4);
  border: 1px solid rgba(0,0,0,0.08);
}

html:not(.dark-mode) .code-copy-btn:hover {
  background: rgba(0,0,0,0.12);
  color: rgba(0,0,0,0.7);
}
</style>
