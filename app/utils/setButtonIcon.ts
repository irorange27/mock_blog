import { createApp, h } from 'vue'
import { Icon } from '#components'

// 把 @nuxt/icon 的 Icon 组件挂载到 DOM 增强出来的按钮里(CodeCopy / CodeRunner 用)。
// 必须 mode: 'svg':这些按钮脱离 Nuxt 应用上下文动态挂载,iconify CSS 模式依赖的
// .iconify 基础样式不会注入,图标会显示为空白。
export function setButtonIcon(btn: HTMLElement, name: string) {
  btn.innerHTML = ''
  createApp({ render: () => h(Icon, { name, mode: 'svg' }) }).mount(btn)
}
