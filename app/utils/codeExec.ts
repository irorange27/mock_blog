/**
 * 代码块浏览器端执行引擎。
 *
 * js / ts:跑在 Blob Worker 里(独立线程、无 DOM),死循环可被 terminate 兜底;
 * ts 先经 sucrase(CDN 懒加载)剥离类型标注再执行。
 * python:跑在 Pyodide(WebAssembly 版 CPython,CDN 懒加载),numpy / scipy /
 * pandas 在检测到 import 时自动加载。
 *
 * 只在客户端调用(组件 onMounted 之后),不做任何服务端执行。
 */

export type RunnerKind = 'js' | 'ts' | 'python'

export interface OutputLine {
  type: 'log' | 'info' | 'warn' | 'error' | 'status'
  text: string
}

/** js 死循环等场景的兜底:超时 terminate,不冻住页面 */
const JS_TIMEOUT_MS = 10_000

/* ────────────────────────── js / ts ────────────────────────── */

const WORKER_PREAMBLE = `
const fmt = (v) => {
  if (typeof v === 'string') return v
  if (v instanceof Error) return v.stack || v.message
  try {
    const s = JSON.stringify(v, null, 2)
    return s === undefined ? String(v) : s
  } catch {
    return String(v)
  }
}
for (const m of ['log', 'info', 'warn', 'error']) {
  console[m] = (...a) => postMessage({ type: m, text: a.map(fmt).join(' ') })
}
self.addEventListener('error', (e) => postMessage({ type: 'error', text: e.message }))
self.addEventListener('unhandledrejection', (e) =>
  postMessage({ type: 'error', text: 'Unhandled rejection: ' + fmt(e.reason) })
)
`

const liveWorkers = new Set<Worker>()

/** 终止某个代码块残留的 Worker(重跑 / 收起输出时调用) */
export function terminateWorker(el: object) {
  const w = (el as any)._runWorker as Worker | undefined
  if (w) {
    w.terminate()
    liveWorkers.delete(w)
    ;(el as any)._runWorker = undefined
  }
}

/** 离开页面时清空所有 Worker */
export function terminateAllWorkers() {
  for (const w of liveWorkers) w.terminate()
  liveWorkers.clear()
}

export function runJs(
  el: HTMLElement,
  code: string,
  onLine: (l: OutputLine) => void,
): Promise<void> {
  terminateWorker(el)
  // 直接 eval 在 async 函数里调用,让示例代码可以用顶层 await;
  // SRC 走 JSON.stringify 注入,不需要对用户代码做任何转义。
  const src =
    `const SRC = ${JSON.stringify(code)};\n` +
    WORKER_PREAMBLE +
    `
;(async () => {
  eval(SRC)
})()
  .catch((err) => console.error(err))
  .finally(() => postMessage({ type: 'done' }))
`
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
  const worker = new Worker(url)
  ;(el as any)._runWorker = worker
  liveWorkers.add(worker)

  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      worker.terminate()
      liveWorkers.delete(worker)
      onLine({ type: 'error', text: `运行超时(${JS_TIMEOUT_MS / 1000} 秒),已终止。检查是否有死循环。` })
      resolve()
    }, JS_TIMEOUT_MS)

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; text?: string }
      if (msg?.type === 'done') {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve()
        // Worker 先不 terminate:done 之后到达的异步日志(setTimeout 之类)仍要显示,
        // 留到该块重跑或离开页面时再终止。
        return
      }
      if (msg?.type && msg.text !== undefined) {
        onLine({ type: msg.type as OutputLine['type'], text: msg.text })
      }
    }
  })
}

/* ────────────────────────── TypeScript ────────────────────────── */

const SUCRASE_URL = 'https://cdn.jsdelivr.net/npm/sucrase@3.35.0/+esm'
let sucrasePromise: Promise<any> | null = null

async function stripTypes(code: string): Promise<string> {
  if (!sucrasePromise) {
    sucrasePromise = import(/* @vite-ignore */ SUCRASE_URL).catch((e) => {
      sucrasePromise = null
      throw e
    })
  }
  const mod: any = await sucrasePromise
  const transform = mod.transform ?? mod.default?.transform
  return transform(code, { transforms: ['typescript'] }).code as string
}

/* ────────────────────────── python ────────────────────────── */

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/'
/** 浏览器里能自动装的纯 WASM 包;torch 等带原生扩展的不在 Pyodide 发行版里 */
const PY_PACKAGES = ['numpy', 'scipy', 'pandas'] as const

let pyodidePromise: Promise<any> | null = null

function getPyodide(): Promise<any> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const mod: any = await import(/* @vite-ignore */ PYODIDE_BASE + 'pyodide.mjs')
      return mod.loadPyodide({ indexURL: PYODIDE_BASE })
    })().catch((e) => {
      pyodidePromise = null
      throw e
    })
  }
  return pyodidePromise
}

async function runPython(code: string, onLine: (l: OutputLine) => void): Promise<void> {
  let py: any
  try {
    onLine({ type: 'status', text: '正在加载 Python 运行时(Pyodide,首次约 10 MB,之后走缓存)…' })
    py = await getPyodide()
  } catch (e: any) {
    onLine({ type: 'error', text: `Python 运行时加载失败(需要联网): ${e?.message ?? e}` })
    return
  }

  for (const pkg of PY_PACKAGES) {
    if (new RegExp(`^\\s*(?:import|from)\\s+${pkg}\\b`, 'm').test(code)) {
      onLine({ type: 'status', text: `加载 ${pkg} …` })
      try {
        await py.loadPackage(pkg)
      } catch (e: any) {
        onLine({ type: 'error', text: `${pkg} 加载失败: ${e?.message ?? e}` })
        return
      }
    }
  }

  py.setStdout({ batched: (s: string) => onLine({ type: 'log', text: s }) })
  py.setStderr({ batched: (s: string) => onLine({ type: 'warn', text: s }) })
  try {
    // 同一页面共享一个解释器:上一篇块里定义的变量,下一个块可以接着用
    await py.runPythonAsync(code)
  } catch (e: any) {
    onLine({ type: 'error', text: String(e?.message ?? e) })
  }
}

/* ────────────────────────── 入口 ────────────────────────── */

export function detectRunner(pre: HTMLElement): RunnerKind | null {
  const cls = `${pre.className} ${pre.querySelector('code')?.className ?? ''}`
  const lang = (cls.match(/language-([\w+#-]+)/)?.[1] ?? '').toLowerCase()
  if (['js', 'javascript', 'mjs', 'cjs'].includes(lang)) return 'js'
  if (['ts', 'typescript', 'mts'].includes(lang)) return 'ts'
  if (['py', 'python'].includes(lang)) return 'python'
  return null
}

export async function runCode(
  el: HTMLElement,
  kind: RunnerKind,
  code: string,
  onLine: (l: OutputLine) => void,
): Promise<void> {
  if (kind === 'python') return runPython(code, onLine)
  const js = kind === 'ts' ? await stripTypes(code) : code
  return runJs(el, js, onLine)
}
