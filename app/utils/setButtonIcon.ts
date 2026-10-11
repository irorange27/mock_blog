import { createVNode, render, type AppContext } from 'vue'
import { Icon } from '#components'

// 把 @nuxt/icon 的 Icon 组件渲染进 DOM 增强出来的按钮里(CodeCopy / CodeRunner 用)。
// 必须 mode: 'svg':这些按钮脱离 Nuxt 应用上下文动态挂载,iconify CSS 模式依赖的
// .iconify 基础样式不会注入,图标会显示为空白。
// 用底层 render() 而非 createApp().mount():重复换图标时按 vnode diff 更新,
// 不会为每个图标新建一个永不卸载的 app 实例。
// NuxtIcon 的 setup 依赖 inject 应用上下文,dev 模式下没有它会直接抛异常
// (整个页面 hydration 失败变 500),所以增强时必须把 appContext 挂到 vnode 上。

let iconAppContext: AppContext | null = null

/** 在组件 setup 期间调用（usePreEnhancer 里），捕获当前应用的 appContext */
export function setIconAppContext(ctx: AppContext | null) {
  iconAppContext = ctx
}

export function setButtonIcon(btn: HTMLElement, name: string) {
  const vnode = createVNode(Icon, { name, mode: 'svg' })
  if (iconAppContext) vnode.appContext = iconAppContext
  render(vnode, btn)
}
