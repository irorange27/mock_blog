# 音乐文章:五线谱/吉他谱显示 + 音频播放

- 日期:2026-07-16
- 状态:已批准设计,待写实现计划
- 技术栈:Nuxt 4 + Nuxt Content v2 + Tailwind + `nuxt generate` 全静态预渲染

## 目标

让博客能书写音乐相关文章:嵌入 Guitar Pro 制作的乐谱(.gp),并支持音频播放。谱子通常较短。

## 决策摘要(brainstorming 结论)

| 维度 | 决定 |
|------|------|
| 渲染库 | **AlphaTab**——直接读 Guitar Pro 原生格式(`.gp`/`.gpx`/`.gp5`),无需转 MusicXML,tab + 五线谱一等公民,自带 SVG 渲染与回放。 |
| 音频 | **两者都要**:AlphaTab 内置 soundfont 回放(谱面内播放、光标跟随、可转调)+ 单独的 RSE MP3(`<audio controls>`,Guitar Pro 导出的真实音色)。 |
| Markdown 调用 | **单一组合组件** `::score{src audio layout}`,一次性渲染谱面 + RSE 播放器。 |
| 谱面布局 | **可配置** `layout="both"`(默认) | `"tab"` | `"staff"`。 |
| 短谱处理 | **仅文件引用**。AlphaTab 只吃 GP 原生格式与 MusicXML,不吃 ABC;内联记谱违背 Guitar Pro 创作工作流,放弃。 |
| 懒加载 | **视口懒加载**。`IntersectionObserver` 滚入附近才初始化 AlphaTab;soundfont 只在首次点播放时加载,整页共享一次。 |
| soundfont 托管 | 先自托管(`public/sounds/`)使 clone 即可跑;soundfont URL 做成单个常量,若实际过重则一行切到 CDN。 |

> 注:渲染与播放解耦——画谱面(解析 `.gp` -> SVG)不需要 soundfont,soundfont 仅在点播放时按需加载。未点播放的读者永不下载它。

## 架构与组件拆分

两个组件,各管一件事,均可独立理解与测试。

### `Score.vue`(MDC 入口编排器)

`::score` 解析到此组件。职责:

- 读取 props:`src`(必填,`.gp` 路径)、`audio`(可选,RSE mp3 路径)、`layout`(`both` | `tab` | `staff`,默认 `both`)。
- 懒加载生命周期:外层 `<ClientOnly>` + SSR `#fallback` 占位(预渲染 HTML 立即显示占位,无白屏闪动),叠一层 `IntersectionObserver`,滚入附近才挂载 `AlphaTabRenderer`。
- 读取 `useColorMode()` 当前主题,作为响应式依赖下传。
- 组合渲染器 + 内联 RSE `<audio controls>`(始终渲染,不依赖懒加载)。

### `AlphaTabRenderer.vue`(AlphaTab 封装)

最脏的部分单独隔离。职责:

- props:`src`、`layout`、`dark`(主题布尔)。
- 组装 AlphaTab settings:把 `layout` 映射到 stave profile、移动端响应式换行、暗色主题配色、接上 soundfont URL(指向单个常量)并将 soundfont 加载推迟到播放时。
- emit `ready` / `error`。
- 所有 AlphaTab 调用包在 try/catch,失败时向 `error` emit 而非抛出。

## 数据流

```
::score{src audio layout}   (Markdown)
        │  MDC 解析
        ▼
Score.vue
   ├─ <ClientOnly> + #fallback 占位
   ├─ IntersectionObserver 进入视口
   │     └─ AlphaTabRenderer.vue
   │           ├─ 解析 .gp -> SVG 谱面(tab/staff/both)
   │           └─ 点播放时加载 soundfont 回放
   └─ <audio controls src={audio}>   (RSE MP3,始终在)
```

Markdown 用法:

```markdown
::score{src="/scores/riff.gp" audio="/audio/riff.mp3" layout="both"}
::
```

## 暗色模式

- `Score.vue` 用 `useColorMode()` 读主题,下传给 `AlphaTabRenderer`。
- 切换主题时,AlphaTab 应用 `settings.notation` / `display` 里的前/背景色后触发 `api.render()` 重绘。
- 关键:初始化前**先读准当前主题再渲染**,避免先用默认 light 硬渲染再重绘造成闪烁。AlphaTab 渲染的是 SVG,CSS 变量对它无效,必须走渲染时配置。

## 移动端

- 容器 `overflow-x: auto`,谱面按真实宽度渲染,横向滚动浏览(吉他谱横向滚动是读者习惯)。
- GP 谱线数固定,强行缩到屏幕宽会让音符糊成一团,故走横向滚动而非缩放。
- `layout="tab"` 时更窄,移动端友好——短 riff 可主动收敛到 `tab`。

## 错误处理

静态站点运行时组件崩了会让 `<ContentRenderer>` 那块空白,故降级必须保证不白屏:

- AlphaTab 加载/解析失败 -> catch,在谱面位置显示降级块:"谱面加载失败" + `<a href={src}>` 直链让读者自取 `.gp`。
- `.gp` 路径写错 404 -> 同样降级(直链自然 404,不崩)。
- RSE `<audio>` 失败由浏览器原生兜底,静默,无需额外处理。
- 所有错误 `console.error` 便于 dev 定位,但不抛到上层。

## 测试

现有 vitest + happy-dom。happy-dom 无完整 WebAudio,策略是**测编排逻辑、隔离 AlphaTab 本身**:

- **`Score.vue` 逻辑测试:** stub 掉 `AlphaTabRenderer`,验证懒加载(初始不挂载子组件、`IntersectionObserver` 回调触发后才挂载)、props 透传(`src`/`audio`/`layout`/`dark`)、RSE `<audio>` 始终在 fallback 渲染。
- **`IntersectionObserver` 在 happy-dom 缺失** -> 测试里用最小桩同步调用回调,或 mount 时手动触发可见。**写进 spec 供后人参考。**
- **不测 AlphaTab 渲染本身**——第三方库职责,测它等于测其实现,脆弱无收益。集成验证靠手测。

## 落地步骤

1. `pnpm add alphatab`,`nuxt.config.ts` 的 `vite.optimizeDeps.include` 加 `alphatab`(CJS,与现有 `vue-easy-lightbox` 同处理,否则 dev 报错)。
2. 写 `AlphaTabRenderer.vue`(纯封装:props + emit)。
3. 写 `Score.vue`(懒加载 + `<ClientOnly>` + fallback + 组合 `<audio>`),soundfont URL 抽成单个常量(默认 `/sounds/...`,可改 CDN)。
4. 放一份真实 `.gp` + RSE `.mp3` 到 `public/scores/`、`public/audio/`,新建一篇音乐文章验证全流程(暗色切换、移动端横向滚动、错误降级)。
5. 跑 `vitest` + `pnpm generate` 确认静态构建通过(预渲染不崩)。

## 静态站点关键约束(贯穿全设计)

- AlphaTab 依赖 DOM + WebAudio + soundfont,纯客户端运行 -> 必须包 `<ClientOnly>`,否则 `nuxt generate` 预渲染报错(这是与 KaTeX 最大的不同:KaTeX 能 SSR,AlphaTab 不能)。
- 多谱文章首屏不堆叠 soundfont -> 懒加载 + soundfont 按需 + 整页共享一次。
