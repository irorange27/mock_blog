<script setup lang="ts">
// ::gp-score — 渲染 Guitar Pro 文件（GP3-GP8 的 .gp/.gp5/.gpx 等）或 alphaTex，支持合成回放。
// 用法一：::gp-score{src="/scores/xxx.gp"}，可选 layout="both|tab|staff"、audio="/audio/xxx.mp3"
//   （audio 是 GP8 RSE 导出的整曲音频，和合成回放二选一听）。
// 用法二：组件内放一个无语言标注的围栏代码块，内容为 alphaTex，适合短 riff，无需二进制文件。
// alphaTab 体量大且依赖浏览器 API，动态 import 不进 SSR 包；其 Web Worker / AudioWorklet
// 加载由 nuxt.config 里的 @coderline/alphatab-vite 插件接住。
// 字体与 soundfont 自托管：public/fonts/alphatab、public/soundfont（路径见 app/utils/gpScore.ts）。
import { FONT_DIRECTORY, SOUNDFONT_URL, normalizeLayout, type ScoreLayout } from '~/utils/gpScore'

type AtApi = import('@coderline/alphatab').AlphaTabApi
type AtSettingsJson = import('@coderline/alphatab').SettingsJson
type AtResourcesJson = NonNullable<NonNullable<AtSettingsJson['display']>['resources']>

const props = defineProps<{
  src?: string
  layout?: string
  audio?: string
}>()

const texSrc = ref<HTMLElement | null>(null) // alphaTex 原文，仅供解析，不展示
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const errored = ref(false)
const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')

let alphatab: typeof import('@coderline/alphatab') | null = null
let api: AtApi | null = null
let soundfontRequested = false

// alphaTab 把颜色烘进 SVG，只认 hex/rgb()/raw 数值，而主题色是 oklch + var()。
// 用 1×1 canvas 让浏览器代解主题变量并取像素值，不硬编码颜色。
let probe: HTMLElement | null = null
let probeCtx: CanvasRenderingContext2D | null = null
const COLOR_SENTINEL = 'rgb(1,2,3)'

function themeColorRaw(name: string): number | null {
  // 探针必须挂进 DOM，否则 getComputedStyle 对 var() 和颜色都返回空
  probe ??= document.createElement('span')
  if (!probe.isConnected) {
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
  }
  probeCtx ??= document.createElement('canvas').getContext('2d')
  if (!probeCtx) return null
  probe.style.color = `var(${name})`
  const computed = getComputedStyle(probe).color
  probeCtx.fillStyle = COLOR_SENTINEL
  probeCtx.fillStyle = computed
  if (probeCtx.fillStyle === COLOR_SENTINEL) return null
  probeCtx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data
  // 打包格式与 alphaTab Color 构造器一致：(a<<24)|(r<<16)|(g<<8)|b
  return (a & 255) << 24 | (r & 255) << 16 | (g & 255) << 8 | (b & 255)
}

// 主色描音符与谱线，次级色画小节号、小节线分隔等次要元素
function applyColors(res: AtResourcesJson) {
  const ink = themeColorRaw('--txt-75')
  const soft = themeColorRaw('--txt-50')
  if (ink !== null) {
    res.mainGlyphColor = ink
    res.staffLineColor = ink
  }
  if (soft !== null) {
    res.secondaryGlyphColor = soft
    res.barNumberColor = soft
    res.barSeparatorColor = soft
    res.scoreInfoColor = soft
  }
}

function staveProfileOf(layout: ScoreLayout) {
  switch (layout) {
    case 'tab': return 'tab'
    case 'staff': return 'score'
    default: return 'scoretab'
  }
}

function buildSettings(): AtSettingsJson {
  const display: NonNullable<AtSettingsJson['display']> = {
    staveProfile: staveProfileOf(normalizeLayout(props.layout)),
  }
  // 回放：soundfont 不在初始化时给，首次点播放再 loadSoundFont，避免访客白下几 MB
  applyColors(display.resources = {})
  return {
    core: { engine: 'svg', useWorkers: true, fontDirectory: FONT_DIRECTORY },
    display,
    player: { enablePlayer: true, enableCursor: true },
  }
}

// 播放状态交给 alphaTab 的事件驱动：stop/自然播完都会走 playerStateChanged 回到 idle。
// PlayerState 只有类型导出，运行时按数值比较（Playing = 1）
function markPlaying(args: { state: import('@coderline/alphatab').PlayerState }) {
  state.value = args.state === 1 ? 'playing' : 'idle'
}

function waitForSoundfont(): Promise<void> {
  return new Promise((resolve, reject) => {
    const offOk = api!.soundFontLoaded.on(() => { offOk(); offFail(); resolve() })
    const offFail = api!.error.on((e: Error) => { offFail(); offOk(); reject(e) })
  })
}

async function togglePlay() {
  if (!api || !ready.value) return
  if (state.value === 'playing') {
    api.stop()
    return
  }
  if (state.value === 'loading') return
  state.value = 'loading'
  try {
    if (!soundfontRequested) {
      soundfontRequested = true
      api.loadSoundFont(SOUNDFONT_URL, false)
      await waitForSoundfont()
    }
    api.play()
    // 成功后的 playing 态由 playerStateChanged 置位；失败落 catch
  } catch {
    // 音色下载失败（多半是网络不通）：允许重试，重置后重新走懒加载
    soundfontRequested = false
    state.value = 'error'
  }
}

function showError(e: unknown) {
  console.error('[gp-score]', e)
  errored.value = true
}

onMounted(async () => {
  const tex = texSrc.value?.textContent?.trim() ?? ''
  if (!props.src && !tex) return
  try {
    alphatab = await import('@coderline/alphatab')
    api = new alphatab.AlphaTabApi(host.value!, buildSettings())
    api.playerStateChanged.on(markPlaying)
    // SVG 图形对读屏零信息（WCAG 1.1.1）：解析出曲名后当文本替代
    api.scoreLoaded.on((score) => {
      host.value!.setAttribute('role', 'img')
      host.value!.setAttribute('aria-label', score.title ? `乐谱：${score.title}` : '乐谱（Guitar Pro）')
    })
    api.error.on((e) => showError(e))

    if (props.src) {
      const res = await fetch(props.src)
      if (!res.ok) throw new Error(`HTTP ${res.status} ${props.src}`)
      api.load(new Uint8Array(await res.arrayBuffer()))
    } else {
      api.tex(tex)
    }
    ready.value = true
  } catch (e) {
    showError(e)
  }
})

// 乐谱颜色是渲染时烘进 SVG 的，主题切换需要改配色后整体重绘
const colorMode = useColorMode()
watch(colorMode, () => {
  if (!api) return
  const res = api.settings.display.resources
  const ink = themeColorRaw('--txt-75')
  const soft = themeColorRaw('--txt-50')
  const set = (c: { raw: number, updateRgba(): void } | null, v: number | null) => {
    if (!c || v === null) return
    c.raw = v
    c.updateRgba()
  }
  set(res.mainGlyphColor, ink)
  set(res.staffLineColor, ink)
  set(res.secondaryGlyphColor, soft)
  set(res.barNumberColor, soft)
  set(res.barSeparatorColor, soft)
  set(res.scoreInfoColor, soft)
  api.updateSettings()
  api.render()
})

onBeforeUnmount(() => {
  api?.destroy()
  api = null
  probe?.remove()
  probe = null
})
</script>

<template>
  <div class="gp-score my-6 rounded-xl border border-[var(--line-color)] bg-[var(--panel-bg)] px-5 pt-4 pb-3">
    <div ref="host" v-show="!errored" class="overflow-x-auto" />
    <!-- 记谱原文：仅供解析，不展示 -->
    <div ref="texSrc" aria-hidden="true" class="hidden"><slot /></div>
    <div v-if="errored" class="my-2 text-sm" role="alert">
      <p class="text-[var(--danger)]">谱面加载失败。</p>
      <a v-if="src" :href="src" download class="underline">点此下载原始乐谱文件</a>
    </div>
    <div v-if="ready && !errored" class="abc-score-bar">
      <button
        class="abc-score-play"
        :class="{ 'abc-score-play-err': state === 'error' }"
        :disabled="state === 'loading'"
        @click="togglePlay"
      >
        <Icon
          :name="state === 'playing' ? 'mdi:stop' : state === 'error' ? 'mdi:alert-outline' : 'mdi:play'"
          class="w-3.5 h-3.5"
          :class="{ 'ml-0.5': state !== 'playing' && state !== 'error' }"
        />
        <span>{{ state === 'playing' ? '停止' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放' }}</span>
      </button>
    </div>
    <audio v-if="audio" controls :src="audio" class="mt-3 w-full" />
  </div>
</template>

<style>
/* 播放游标：alphaTab 只创建透明 div，颜色由网站定（https://www.alphatab.net/docs/tutorial-web/player）。
   作用域限 .gp-score，避免污染站内其他内容。小节底色淡、拍线用主题主色。 */
.gp-score .at-cursor-bar {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}
.gp-score .at-cursor-beat {
  background: var(--primary);
  width: 3px;
}
.gp-score .at-selection div {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.gp-score .at-highlight * {
  fill: var(--primary);
  stroke: var(--primary);
}
</style>
