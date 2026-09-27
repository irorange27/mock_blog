import { createVNode, render } from 'vue'
import { Icon } from '#components'

// 把 @nuxt/icon 的 Icon 组件渲染进 DOM 增强出来的按钮里(CodeCopy / CodeRunner 用)。
// 必须 mode: 'svg':这些按钮脱离 Nuxt 应用上下文动态挂载,iconify CSS 模式依赖的
// .iconify 基础样式不会注入,图标会显示为空白。
// 用底层 render() 而非 createApp().mount():重复换图标时按 vnode diff 更新,
// 不会为每个图标新建一个永不卸载的 app 实例。
export function setButtonIcon(btn: HTMLElement, name: string) {
  render(createVNode(Icon, { name, mode: 'svg' }), btn)
}
