<script setup lang="ts">
// 给 js / ts / python 代码块加「运行」按钮,浏览器本地执行,输出显示在代码块下方。
// 与 CodeCopy 是一对：共用 usePreEnhancer 观察器和 main.css 的 .code-btn 基础样式，
// 本组件会把 .code-copy-btn 左移让位（样式见下），两者需同增同删。

const enhance = () => {
  document.querySelectorAll('pre:not([data-run-done])').forEach((pre) => {
    const el = pre as HTMLElement
    el.setAttribute('data-run-done', 'true')
    const kind = detectRunner(el)
    if (!kind) return
    el.setAttribute('data-runnable', kind)

    const btn = document.createElement('button')
    setButtonIcon(btn, 'mdi:play')
    btn.className = 'code-btn code-run-btn'
    btn.title = '运行'
    btn.setAttribute('aria-label', '运行代码')
    btn.addEventListener('click', () => execute(el, btn, kind))
    el.appendChild(btn)
  })
}

usePreEnhancer(enhance)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  terminateAllWorkers()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopTitleFlash()
})

/* ── 后台标签页的结束提醒:交替闪烁标题,切回页面或超时后还原 ── */
let titleTimer: ReturnType<typeof setInterval> | null = null
let titleCapTimer: ReturnType<typeof setTimeout> | null = null
let titleFlashOn = false
let originalTitle = ''

function onVisibilityChange() {
  if (!document.hidden) stopTitleFlash()
}

function stopTitleFlash() {
  if (titleTimer) clearInterval(titleTimer)
  if (titleCapTimer) clearTimeout(titleCapTimer)
  titleTimer = titleCapTimer = null
  if (titleFlashOn) {
    document.title = originalTitle
    titleFlashOn = false
  }
}

function startTitleFlash(failed: boolean) {
  stopTitleFlash()
  originalTitle = document.title
  const flashTitle = failed ? '✗ 代码运行出错' : '✓ 代码运行完成'
  document.title = flashTitle
  titleFlashOn = true
  titleTimer = setInterval(() => {
    document.title = document.title === flashTitle ? originalTitle : flashTitle
  }, 800)
  // 最多闪 15 秒,读者离开再久也不一直占着标题(SPA 路由切页同样要写标题)
  titleCapTimer = setTimeout(stopTitleFlash, 15_000)
}

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

  const t0 = performance.now()
  let hasError = false
  const append = (l: OutputLine) => {
    if (l.type === 'error') hasError = true
    if (!panel!.isConnected) return
    const row = document.createElement('div')
    row.className = `code-run-line code-run-${l.type}`
    row.textContent = l.text
    panel!.insertBefore(row, panel!.querySelector('.code-run-close'))
    panel!.scrollTop = panel!.scrollHeight
  }

  btn.disabled = true
  setButtonIcon(btn, 'mdi:loading')
  btn.classList.add('is-loading')
  btn.title = '运行中'
  runCode(pre, kind, code, append)
    .catch((e: any) => append({ type: 'error', text: `无法执行: ${e?.message ?? e}` }))
    .finally(() => {
      btn.disabled = false
      btn.classList.remove('is-loading')
      setButtonIcon(btn, 'mdi:play')
      btn.title = '运行'
      // 结束提醒:输出末尾标注结果与耗时;标签页在后台时再闪标题。
      // 秒级内跑完的块输出即时可见,结尾行只是噪音,只在等待过或有报错时给。
      const elapsed = performance.now() - t0
      if (hasError || elapsed >= 1000 || document.hidden) {
        append({
          type: hasError ? 'error' : 'status',
          text: `${hasError ? '✗ 运行出错' : '✓ 运行完成'}(${(elapsed / 1000).toFixed(1)} 秒)`,
        })
        if (document.hidden) startTitleFlash(hasError)
      }
    })
}
</script>

<template><div /></template>

<style>
/* 基础外观在 main.css 的 .code-btn，这里只有运行键自己的差异 */
.code-run-btn:hover:not(:disabled) {
  color: var(--primary);
}

.code-run-btn:focus-visible,
.code-run-btn:disabled {
  opacity: 1;
}

.code-run-btn.is-loading svg {
  animation: code-run-rotate 0.8s linear infinite;
}

@keyframes code-run-rotate {
  to { transform: rotate(360deg); }
}

/* 有运行键的代码块,复制键左移让位（依赖 CodeCopy 组件存在） */
pre[data-runnable] .code-copy-btn {
  right: 44px;
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
