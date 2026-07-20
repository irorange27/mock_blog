# 乐谱显示 + 音频播放 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让博客能在 Markdown 里用 `::score` 嵌入 Guitar Pro 乐谱(`.gp`),用 AlphaTab 渲染 tab/五线谱,并支持谱内 soundfont 回放 + RSE MP3 播放。

**Architecture:** 两个组件分工:`Score.vue` 负责编排(`<ClientOnly>` + `IntersectionObserver` 视口懒加载 + 读 colorMode + 组合 `<audio>`),`AlphaTabRenderer.vue` 负责封装 AlphaTab(解析 `.gp`→SVG、暗色配色、按需 soundfont 回放)。纯逻辑(`normalizeLayout` 等)抽到 `app/utils/score.ts` 走纯函数单测,贴合现有 `tests/utils/blog.test.ts` 风格;编排逻辑用 `@nuxt/test-utils` 的 `mountSuspended` 挂载测试(stub 掉 AlphaTab);AlphaTab 集成本身按 spec"集成验证靠手测",不写单测。

**Tech Stack:** Nuxt 4.4 + Nuxt Content 2.13(MDC)、`@nuxtjs/color-mode` 3.5、Tailwind、vitest(`environment: 'nuxt'`)、`@nuxt/test-utils` 的 `mountSuspended`、AlphaTab(CJS,需 `vite.optimizeDeps`)、`nuxt generate` 全静态预渲染。

## Global Constraints

- Node `>=22`,包管理器 **pnpm**(见 `package.json` 的 `packageManager`)。
- `srcDir` 为 `app/`:组件放 `app/components/`,工具放 `app/utils/`,二者均自动导入(MDC 也可直接用 `::score` 指向 `app/components/Score.vue`)。
- 测试在 `tests/` 下,vitest `environment: 'nuxt'`(见 `vitest.config.ts`),import 路径用 `~/utils/...`(自动导入别名)。
- 全静态站点(`nuxt generate`):任何依赖 DOM/WebAudio 的代码必须包 `<ClientOnly>`,否则预渲染崩溃。
- 遵循现有 `<script setup lang="ts">` + 自动导入(`ref`/`computed`/`onMounted`/`useColorMode` 等无需手动 import)的组件风格(见 `app/components/ColorModeSwitch.vue`、`ImageLightbox.vue`)。
- commit 信息沿用现有 `feat(blog): ...` 前缀风格(见 `git log`)。

---

### Task 1: 引入 AlphaTab 依赖与 Vite 预构建配置

**Files:**
- Modify: `package.json`(通过 pnpm 安装,不手改)
- Modify: `nuxt.config.ts:66-70`(`vite.optimizeDeps.include`)

**Interfaces:**
- Produces:`alphatab` 作为可 import 的依赖(后续 Task 3 用 `import { AlphaTabApi, Settings, StaveProfile } from 'alphatab'`)。

- [ ] **Step 1: 安装 alphatab**

Run:
```bash
pnpm add alphatab
```
Expected:`package.json` 的 `dependencies` 出现 `"alphatab": "^..."`,`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 确认 alphaTab 的导出与 Settings 类型**

运行(确认类名与属性真实存在,后续 Task 用到):
```bash
node -e "import('alphatab').then(m => console.log(Object.keys(m).filter(k => /^(AlphaTabApi|Settings|StaveProfile|NotationMode|JsonExporter)/.test(k))))"
```
Expected:输出包含 `AlphaTabApi`、`Settings`、`StaveProfile`。

再确认 `Settings` 上 soundfont 与 stave 相关属性的确切路径(后续 Task 3 要用):
```bash
grep -rE 'soundFont|staveProfile|notationMode' node_modules/alphatab/dist/*.d.ts | head -30
```
记录输出中 `soundFont`、`staveProfile`、`notationMode` 分别挂在 `Settings` 的哪个子对象(`core` / `display` / `notation` / `player`)。**后续 Task 3 按此处查到的真实路径填写,不要凭记忆。**

- [ ] **Step 3: 加入 Vite 预构建**

`nuxt.config.ts` 当前(`66-70` 行):
```ts
  vite: {
    optimizeDeps: {
      include: ['vue-easy-lightbox'],
    },
  },
```
改为:
```ts
  vite: {
    optimizeDeps: {
      include: ['vue-easy-lightbox', 'alphatab'],
    },
  },
```

- [ ] **Step 4: 验证 dev 服务器能起来**

Run:
```bash
pnpm dev
```
Expected:无 `optimizeDeps`/CJS 相关报错,服务器正常启动(在浏览器打开本地地址确认首页正常后 `Ctrl+C` 停止)。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml nuxt.config.ts
git commit -m "feat(blog): add alphatab dependency and vite optimizeDeps"
```

---

### Task 2: 纯工具 `app/utils/score.ts` + 单元测试

**Files:**
- Create: `app/utils/score.ts`
- Test: `tests/utils/score.test.ts`

**Interfaces:**
- Produces(后续 Task 3、4 依赖):
  - `export type ScoreLayout = 'both' | 'tab' | 'staff'`
  - `export const DEFAULT_LAYOUT: ScoreLayout = 'both'`
  - `export const SOUNDFONT_URL: string`
  - `export function normalizeLayout(layout: string | undefined): ScoreLayout`

- [ ] **Step 1: 写失败测试**

创建 `tests/utils/score.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizeLayout, DEFAULT_LAYOUT, SOUNDFONT_URL } from '~/utils/score'

describe('normalizeLayout', () => {
  it('应原样接受合法值', () => {
    expect(normalizeLayout('both')).toBe('both')
    expect(normalizeLayout('tab')).toBe('tab')
    expect(normalizeLayout('staff')).toBe('staff')
  })

  it('对非法/空值回落到默认', () => {
    expect(normalizeLayout(undefined)).toBe(DEFAULT_LAYOUT)
    expect(normalizeLayout('')).toBe(DEFAULT_LAYOUT)
    expect(normalizeLayout('Tab')).toBe(DEFAULT_LAYOUT) // 大小写敏感
    expect(normalizeLayout('nonsense')).toBe(DEFAULT_LAYOUT)
  })
})

describe('SOUNDFONT_URL', () => {
  it('指向 public/sounds 下的本地路径', () => {
    expect(SOUNDFONT_URL).toMatch(/^\/sounds\//)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
pnpm test -- tests/utils/score.test.ts
```
Expected:FAIL,提示找不到 `~/utils/score` 模块。

- [ ] **Step 3: 实现最小代码**

创建 `app/utils/score.ts`:
```ts
// 本地自托管的 AlphaTab soundfont;若实际过重,把此常量改成 CDN URL 即可。
// soundfont 仅在用户点播放时才被 alphaTab 拉取,不点不下载。
export const SOUNDFONT_URL = '/sounds/sonivox.sf2'

export type ScoreLayout = 'both' | 'tab' | 'staff'

export const DEFAULT_LAYOUT: ScoreLayout = 'both'

export function normalizeLayout(layout: string | undefined): ScoreLayout {
  if (layout === 'both' || layout === 'tab' || layout === 'staff') return layout
  return DEFAULT_LAYOUT
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:
```bash
pnpm test -- tests/utils/score.test.ts
```
Expected:PASS(3 + 1 = 4 用例全绿)。

- [ ] **Step 5: Commit**

```bash
git add app/utils/score.ts tests/utils/score.test.ts
git commit -m "feat(blog): add score layout util and tests"
```

---

### Task 3: `AlphaTabRenderer.vue` —— AlphaTab 集成封装(集成验证,手测)

**Files:**
- Create: `app/components/AlphaTabRenderer.vue`

**Interfaces:**
- Consumes:`import { AlphaTabApi, Settings, StaveProfile } from 'alphatab'`(Task 1 已装);`import { SOUNDFONT_URL, type ScoreLayout } from '~/utils/score'`(Task 2)。
- Produces:`<AlphaTabRenderer>` 组件,props `{ src: string; layout: ScoreLayout; dark: boolean }`,emit `ready` / `error`。供 `Score.vue`(Task 4)使用。

> 说明:本任务按 spec"不测 AlphaTab 渲染本身,集成验证靠手测",不写单测。属性路径以 **Task 1 Step 2 查到的真实类型为准**,下列代码中标注 `// ⚠ 按查到的路径填` 的位置需据实调整。

- [ ] **Step 1: 撰写组件**

创建 `app/components/AlphaTabRenderer.vue`:
```vue
<script setup lang="ts">
import { AlphaTabApi, Settings, StaveProfile } from 'alphatab'
import { SOUNDFONT_URL, type ScoreLayout } from '~/utils/score'

const props = defineProps<{
  src: string
  layout: ScoreLayout
  dark: boolean
}>()

const emit = defineEmits<{
  ready: []
  error: [message: string]
}>()

const target = ref<HTMLElement | null>(null)
const errored = ref(false)
let api: AlphaTabApi | null = null

function layoutToStaveProfile(layout: ScoreLayout): StaveProfile {
  switch (layout) {
    case 'tab': return StaveProfile.Tab
    case 'staff': return StaveProfile.Score
    default: return StaveProfile.Mixed // 'both' -> 五线谱 + tab
  }
}

function buildSettings(): Settings {
  const settings = new Settings()
  settings.core.engine = 'svg'
  settings.core.useWorkers = true
  settings.core.logLevel = 'error'

  // ⚠ 按查到的路径填:把布局映射到 stave profile。
  //   若 Task1 Step2 查到是 settings.display.staveProfile,就用这行;
  //   若是 settings.notation.staveProfile,改成 settings.notation.staveProfile。
  settings.display.staveProfile = layoutToStaveProfile(props.layout)

  // 暗色:alphaTab 渲染 SVG,需改其配色资源。按查到的 display.resources 颜色字段填。
  if (props.dark) {
    settings.display.resources.staffColor = '#e5e7eb'      // 浅灰五线
    settings.display.resources.mainGlyphColor = '#e5e7eb'   // 浅灰音符
    settings.display.resources.secondaryGlyphColor = '#9ca3af'
  }

  // 回放:soundfont 仅在点播放时拉取,整页共享。
  settings.player.enablePlayer = true
  settings.player.enableCursor = true
  settings.player.enableUserInteraction = true
  // ⚠ 按查到的路径填 soundFont:若在 core 下用 settings.core.soundFont,
  //   若在 player 下改成 settings.player.soundFont。
  settings.core.soundFont = SOUNDFONT_URL
  return settings
}

async function loadScore() {
  if (!target.value) return
  try {
    api = new AlphaTabApi(target.value, buildSettings())
    const res = await fetch(props.src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = new Uint8Array(await res.arrayBuffer())
    api.load(buf)
    emit('ready')
  } catch (e) {
    errored.value = true
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[AlphaTabRenderer] load failed', msg)
    emit('error', msg)
  }
}

onMounted(loadScore)

watch(() => props.dark, () => {
  if (!api) return
  // 切换主题后重绘配色
  if (props.dark) {
    api.settings.display.resources.staffColor = '#e5e7eb'
    api.settings.display.resources.mainGlyphColor = '#e5e7eb'
    api.settings.display.resources.secondaryGlyphColor = '#9ca3af'
  } else {
    // 恢复 alphaTab 默认(空串触发内置默认)
    api.settings.display.resources.staffColor = ''
    api.settings.display.resources.mainGlyphColor = ''
    api.settings.display.resources.secondaryGlyphColor = ''
  }
  api.render()
})

onBeforeUnmount(() => {
  api?.destroy()
  api = null
})
</script>

<template>
  <div>
    <div v-show="!errored" ref="target" class="at-target overflow-x-auto" />
    <div v-if="errored" class="my-4 p-4 rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
      谱面加载失败。<a :href="src" class="underline">点此下载原始 .gp 文件</a>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 校对属性路径(必做)**

打开 Task 1 Step 2 记下的 grep 输出,逐项核对并修正上述 `// ⚠` 三处:
1. `staveProfile` 所在子对象(`display` / `notation`),改成真实路径。
2. `soundFont` 所在子对象(`core` / `player`),改成真实路径。
3. 暗色配色字段名(`staffColor` / `mainGlyphColor` / `secondaryGlyphColor`)用 grep 出来的真实字段名:
   ```bash
   grep -rE 'staffColor|mainGlyphColor|secondaryGlyphColor' node_modules/alphatab/dist/*.d.ts | head
   ```
   若名字不同,替换成真实名;若某些字段不存在就删掉那一行(只保留确实存在的)。

- [ ] **Step 3: 确认组件能被解析(语法/类型自检)**

Run:
```bash
pnpm dev
```
Expected:无编译错误(不需要真正渲染,只要启动不报 `.vue` 语法/类型错)。浏览器打开首页正常后 `Ctrl+C` 停止。

- [ ] **Step 4: Commit**

```bash
git add app/components/AlphaTabRenderer.vue
git commit -m "feat(blog): add AlphaTabRenderer component"
```

---

### Task 4: `Score.vue` 编排组件 + 挂载测试

**Files:**
- Create: `app/components/Score.vue`
- Test: `tests/components/Score.test.ts`

**Interfaces:**
- Consumes:`<AlphaTabRenderer>`(Task 3);`normalizeLayout`、`type ScoreLayout`(Task 2);`useColorMode()`(自动导入)。
- Produces:MDC 可用的 `::score` 组件,props `{ src: string; audio?: string; layout?: string }`。

- [ ] **Step 1: 写失败测试**

创建 `tests/components/Score.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Score from '~/components/Score.vue'

// happy-dom 没有 IntersectionObserver,用桩把回调暴露出来便于在测试里触发。
let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null
class FakeIO {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { ioCallback = cb }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// AlphaTabRenderer 的桩:声明 props 以便断言透传,渲染一个可被选择器的占位 div。
const RendererStub = defineComponent({
  name: 'AlphaTabRenderer',
  props: ['src', 'layout', 'dark'],
  template: '<div data-testid="alphatab-renderer" />',
})

beforeEach(() => {
  ioCallback = null
  // @ts-expect-error 挂桩到全局
  globalThis.IntersectionObserver = FakeIO
})

describe('Score.vue', () => {
  it('初始不渲染 AlphaTabRenderer,但 RSE <audio> 始终在', async () => {
    const wrapper = await mountSuspended(Score, {
      props: { src: '/scores/riff.gp', audio: '/audio/riff.mp3', layout: 'tab' },
      global: { stubs: { AlphaTabRenderer: RendererStub } },
    })
    expect(wrapper.find('[data-testid="alphatab-renderer"]').exists()).toBe(false)
    expect(wrapper.find('audio').exists()).toBe(true)
    expect(wrapper.find('audio').attributes('src')).toBe('/audio/riff.mp3')
  })

  it('进入视口后才挂载 AlphaTabRenderer 并透传 props', async () => {
    const wrapper = await mountSuspended(Score, {
      props: { src: '/scores/riff.gp', layout: 'staff' },
      global: { stubs: { AlphaTabRenderer: RendererStub } },
    })
    // 触发可见
    expect(ioCallback).not.toBeNull()
    ioCallback!([{ isIntersecting: true }])
    await nextTick()
    const renderer = wrapper.findComponent(RendererStub)
    expect(renderer.exists()).toBe(true)
    expect(renderer.props('src')).toBe('/scores/riff.gp')
    expect(renderer.props('layout')).toBe('staff') // 已 normalize
    expect(typeof renderer.props('dark')).toBe('boolean')
    // 没有 audio 时不渲染 <audio>
    expect(wrapper.find('audio').exists()).toBe(false)
  })

  it('layout 非法时回落到默认 both', async () => {
    const wrapper = await mountSuspended(Score, {
      props: { src: '/scores/x.gp', layout: 'wat' },
      global: { stubs: { AlphaTabRenderer: RendererStub } },
    })
    ioCallback!([{ isIntersecting: true }])
    await nextTick()
    expect(wrapper.findComponent(RendererStub).props('layout')).toBe('both')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run:
```bash
pnpm test -- tests/components/Score.test.ts
```
Expected:FAIL(组件不存在 / import 报错)。

- [ ] **Step 3: 实现组件**

创建 `app/components/Score.vue`:
```vue
<script setup lang="ts">
import { normalizeLayout, type ScoreLayout } from '~/utils/score'

const props = defineProps<{
  src: string
  audio?: string
  layout?: string
}>()

const colorMode = useColorMode()
const dark = computed(() => colorMode.value === 'dark')

const wrapperEl = ref<HTMLElement | null>(null)
const isVisible = ref(false)
let observer: IntersectionObserver | null = null

const resolvedLayout = computed<ScoreLayout>(() => normalizeLayout(props.layout))

onMounted(() => {
  if (!wrapperEl.value || typeof IntersectionObserver === 'undefined') {
    // 无 IO 支持(如非常老的浏览器)直接渲染
    isVisible.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      isVisible.value = true
      observer?.disconnect()
    }
  })
  observer.observe(wrapperEl.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="wrapperEl" class="score-block my-6">
    <ClientOnly>
      <AlphaTabRenderer
        v-if="isVisible"
        :src="src"
        :layout="resolvedLayout"
        :dark="dark"
      />
      <div v-else class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        谱面准备就绪,滚动到此处显示
      </div>
      <template #fallback>
        <div class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          谱面加载中…
        </div>
      </template>
    </ClientOnly>

    <audio
      v-if="audio"
      controls
      :src="audio"
      class="mt-3 w-full"
    />
  </div>
</template>
```

- [ ] **Step 4: 跑测试确认通过**

Run:
```bash
pnpm test -- tests/components/Score.test.ts
```
Expected:PASS(3 用例全绿)。若 `mountSuspended` 下 `<ClientOnly>` 行为导致断言不符(例如桩始终渲染或始终不渲染),把测试里对 `[data-testid="alphatab-renderer"]` 的判断改为基于 `isVisible` 触发前后的**变化**断言,而非绝对值;记录原因到 commit 信息。

- [ ] **Step 5: Commit**

```bash
git add app/components/Score.vue tests/components/Score.test.ts
git commit -m "feat(blog): add Score MDC component with lazy-load and tests"
```

---

### Task 5: 示例素材 + 演示文章 + 全流程手测 + 静态构建验证

**Files:**
- Create: `public/scores/<示例>.gp`(用户提供素材)
- Create: `public/audio/<示例>.mp3`(用户提供素材)
- Create: `public/sounds/sonivox.sf2`(soundfont 素材)
- Create: `content/posts/music-score-demo.md`

**Interfaces:**
- Produces:一篇可访问的演示文章,验证 `::score` 端到端可用。

- [ ] **Step 1: 放入示例乐谱与音频**

从 Guitar Pro 导出一份短示例:
- `.gp` 文件放到 `public/scores/demo-riff.gp`。
- 同一曲的 RSE 音频导出 MP3 放到 `public/audio/demo-riff.mp3`。
路径只是示例,可自定,后续 Markdown 里保持一致即可。

- [ ] **Step 2: 放入 soundfont**

获取一个 alphaTab 兼容的 soundfont(SoundFont2 `.sf2` 格式,数 MB;可从 alphaTab 官方文档/发布资源获取),放到 `public/sounds/sonivox.sf2`。
- 若 Task 1 Step 2 查到 alphaTab 要求的是 JS 变体而非 `.sf2`,则改放对应文件,并把 `app/utils/score.ts` 的 `SOUNDFONT_URL` 改成实际路径(保持以 `/sounds/` 开头,Task 2 测试仍通过)。

- [ ] **Step 3: 写演示文章**

创建 `content/posts/music-score-demo.md`(frontmatter 仿现有文章):
```markdown
---
title: 乐谱与音频嵌入演示
date: 2026-07-16T00:00:00.000Z
categories: 音乐
tags:
  - 音乐
  - 吉他
  - alphatab
description: 测试在文章中嵌入 Guitar Pro 谱面与音频。
---

## 默认(tab + 五线谱)

::score{src="/scores/demo-riff.gp" audio="/audio/demo-riff.mp3"}
::

## 仅 tab

::score{src="/scores/demo-riff.gp" layout="tab"}
::

## 仅五线谱

::score{src="/scores/demo-riff.gp" layout="staff"}
::
```

- [ ] **Step 4: 手测全流程**

Run:
```bash
pnpm dev
```
浏览器打开 `http://localhost:3000/posts/music-score-demo`,逐项核对:
1. 三处 `::score` 都渲染出 SVG 谱面(布局分别为 both / tab / staff)。
2. 页面首屏不卡(谱面滚入视口才初始化)。
3. 点谱面播放按钮能出声(soundfont 在首次播放时加载)。
4. 第一个 score 下方的 `<audio>` 能播放 RSE MP3。
5. 用 `/ColorModeSwitch` 切暗色:谱面配色跟随变化、无闪烁。
6. 把某个 `src` 改成不存在的路径,刷新,看到"谱面加载失败 + 下载直链"降级块,文章其余部分正常。
7. 移动端宽度下谱面可横向滚动、不溢出撑破布局。

逐项确认后再进入下一步。

- [ ] **Step 5: 跑全量单测**

Run:
```bash
pnpm test
```
Expected:全绿(含新增 `tests/utils/score.test.ts` 与 `tests/components/Score.test.ts`,以及原有测试)。

- [ ] **Step 6: 验证静态构建不崩**

Run:
```bash
pnpm generate
```
Expected:构建成功,无 `<ClientOnly>`/DOM/WebAudio 相关预渲染报错(`.output/public` 生成)。**这是全静态站的关键回归点。**

- [ ] **Step 7: Commit**

```bash
git add public/ content/posts/music-score-demo.md
git commit -m "feat(blog): add music score demo post and sample assets"
```

---

## Self-Review(写完自查,已纳入计划)

- **Spec 覆盖**:渲染库 AlphaTab ✓;音频(soundfont + RSE MP3 两者)✓;单一组合组件 `::score{src audio layout}` ✓;layout 可配置 both/tab/staff ✓;仅文件引用 ✓;视口懒加载 ✓;soundfont 自托管 + 常量可一行切 CDN ✓;暗色跟随重绘 ✓;移动端横向滚动 ✓;错误降级直链 ✓;单测覆盖编排+纯逻辑、集成靠手测 ✓;静态构建不崩验证 ✓。
- **占位符**:无 TODO/TBD;Task 3 的 `// ⚠` 是"按已查到的真实类型填",配有具体 grep 校对步骤,非空泛占位。
- **类型一致性**:`ScoreLayout`、`normalizeLayout`、`SOUNDFONT_URL`、`DEFAULT_LAYOUT` 在 Task 2 定义、Task 3/4 消费,签名一致;`AlphaTabRenderer` 的 props `{src,layout,dark}` 在 Task 3 定义、Task 4 的桩与模板消费,一致;`Score` 的 props `{src,audio?,layout?}` 在 Task 4 定义、Task 5 的 Markdown 消费,一致。
