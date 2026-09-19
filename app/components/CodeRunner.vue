<script setup lang="ts">
// 给 js / ts / python 代码块加「运行」按钮,浏览器本地执行,输出显示在代码块下方。
// 与 CodeCopy 同一套渲染后 DOM 增强的思路:MutationObserver 兜住路由切换后新出现的 pre。
let disposed = false

onMounted(() => {
  const enhance = () => {
    if (disposed) return
    document.querySelectorAll('pre:not([data-run-done])').forEach((pre) => {
      const el = pre as HTMLElement
      el.setAttribute('data-run-done', 'true')
      const kind = detectRunner(el)
      if (!kind) return
      el.setAttribute('data-runnable', kind)

      const btn = document.createElement('button')
      btn.textContent = '运行'
      btn.className = 'code-run-btn'
      btn.addEventListener('click', () => execute(el, btn, kind))
      el.appendChild(btn)
    })
  }

  enhance()
  const observer = new MutationObserver(enhance)
  observer.observe(document.body, { childList: true, subtree: true })
  onUnmounted(() => {
    observer.disconnect()
    disposed = true
    terminateAllWorkers()
  })
})

function execute(pre: HTMLElement, btn: HTMLButtonElement, kind: RunnerKind) {
  const code = pre.querySelector('code')?.textContent ?? ''

  let panel = pre.nextElementSibling as HTMLElement | null
  if (!panel?.classList.contains('code-run-output')) {
    panel = document.createElement('div')
    panel.className = 'code-run-output'

    const close = document.createElement('button')
    close.className = 'code-run-close'
    close.textContent = '✕'
    close.title = '收起输出'
    close.addEventListener('click', () => {
      terminateWorker(pre)
      panel!.remove()
    })
    panel.appendChild(close)

    pre.after(panel)
  }

  // 重跑时清掉上次的输出行,保留关闭按钮
  for (const row of [...panel.children]) {
    if (!row.classList.contains('code-run-close')) row.remove()
  }

  const append = (l: OutputLine) => {
    if (!panel!.isConnected) return
    const row = document.createElement('div')
    row.className = `code-run-line code-run-${l.type}`
    row.textContent = l.text
    panel!.insertBefore(row, panel!.querySelector('.code-run-close'))
    panel!.scrollTop = panel!.scrollHeight
  }

  btn.disabled = true
  btn.textContent = '运行中'
  runCode(pre, kind, code, append)
    .catch((e: any) => append({ type: 'error', text: `无法执行: ${e?.message ?? e}` }))
    .finally(() => {
      btn.disabled = false
      btn.textContent = '运行'
    })
}
</script>

<template><div /></template>

<style>
/* ── 运行按钮(样式与 .code-copy-btn 同族,hover 用主色) ── */
.code-run-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 52px;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

pre:hover .code-run-btn,
.code-run-btn:focus-visible,
.code-run-btn:disabled {
  opacity: 1;
}

/* 有运行键的代码块,复制键左移让位 */
pre[data-runnable] .code-copy-btn {
  right: 72px;
}

html.dark-mode .code-run-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

html.dark-mode .code-run-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: var(--primary);
}

html:not(.dark-mode) .code-run-btn {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

html:not(.dark-mode) .code-run-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.12);
  color: var(--primary);
}

/* ── 输出面板(与代码块同底的终端式区域) ── */
.code-run-output {
  position: relative;
  margin: -1rem 0 1.25rem;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border-radius: 0 0 0.375rem 0.375rem;
  border-top: 1px solid var(--line-color);
  background-color: var(--pre-bg);
  color: var(--pre-fg);
  font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.7;
  max-height: 320px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.code-run-line + .code-run-line {
  margin-top: 0.125rem;
}

.code-run-log,
.code-run-info {
  color: inherit;
}

.code-run-status {
  color: var(--txt-30);
}

.code-run-warn {
  color: var(--adm-warning);
}

.code-run-error {
  color: var(--danger);
}

.code-run-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  line-height: 1;
  border-radius: 5px;
  cursor: pointer;
  color: var(--txt-30);
  background: transparent;
  border: none;
  transition: color 0.2s, background-color 0.2s;
}

.code-run-close:hover {
  color: var(--txt-75);
  background-color: color-mix(in oklab, var(--txt-50) 14%, transparent);
}
</style>
