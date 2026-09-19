// mdc 渲染器的白名单只认 HTML 标签，KaTeX 公式输出的 MathML/SVG 标签（mi、mrow、
// path 等）会被 Vue 按组件名解析，打出一大墙 "Failed to resolve component" 警告。
// 实际渲染不受影响（最终仍按原生标签输出），这里在 dev 下过滤掉这类噪音，
// 其余警告保持 Vue 默认行为原样输出。
const NON_COMPONENT_TAGS = new Set([
  // MathML（KaTeX 的无障碍树）
  'math', 'semantics', 'annotation', 'annotationxml', 'mrow', 'mi', 'mn', 'mo',
  'ms', 'mtext', 'mspace', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'merror',
  'mpadded', 'mphantom', 'mfenced', 'menclose', 'msub', 'msup', 'msubsup',
  'munder', 'mover', 'munderover', 'mmultiscripts', 'mtable', 'mtr',
  'mlabeledtr', 'mtd', 'maction', 'mglyph',
  // SVG（KaTeX 的大定界符/延伸符号）
  'svg', 'path', 'g', 'line', 'rect', 'use', 'defs',
])

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev) return
  nuxtApp.vueApp.config.warnHandler = (msg, _instance, trace) => {
    const hit = msg.match(/Failed to resolve component: ([\w-]+)/)
    if (hit && NON_COMPONENT_TAGS.has(hit[1].toLowerCase().replace(/-/g, ''))) return
    console.warn(`[Vue warn]: ${msg}${trace}`)
  }
})
