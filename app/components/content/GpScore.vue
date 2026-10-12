<script setup lang="ts">
// ::gp-score — 渲染 Guitar Pro 文件（GP3-GP8 的 .gp/.gp5/.gpx 等）或 alphaTex，支持合成回放。
// 用法一：::gp-score{src="/scores/xxx.gp"}，可选 layout="both|tab|staff"、audio="/audio/xxx.mp3"
//   （audio 是 GP8 RSE 导出的整曲音频，和合成回放二选一听）。
// 用法二：组件内放一个无语言标注的围栏代码块，内容为 alphaTex，适合短 riff，无需二进制文件。
// alphaTab 体量大且依赖浏览器 API，动态 import 不进 SSR 包；其 Web Worker / AudioWorklet
// 加载由 nuxt.config 里的 @coderline/alphatab-vite 插件接住。
// 字体与 soundfont 自托管：public/fonts/alphatab、public/soundfont（路径见 app/utils/gpScore.ts）。
import { FONT_DIRECTORY, FULLSCREEN_SCALE, SCROLL_OFFSET_X, SOUNDFONT_URL, clampScale, clampSpeed, clampVolume, formatTime, normalizeLayout, normalizeTrackMode, type GpTrackInfo, type ScoreLayout, type TrackMode } from '~/utils/gpScore'

type AtApi = import('@coderline/alphatab').AlphaTabApi
type AtSettingsJson = import('@coderline/alphatab').SettingsJson
type AtResourcesJson = NonNullable<NonNullable<AtSettingsJson['display']>['resources']>
type AtTrack = import('@coderline/alphatab').Track

const props = defineProps<{
  src?: string
  layout?: string
  audio?: string
  tracks?: string
}>()

const texSrc = ref<HTMLElement | null>(null) // alphaTex 原文，仅供解析，不展示
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const errored = ref(false)
const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
const rendering = ref(false) // 切轨/缩放重绘中，谱面区盖遮罩

// 音轨：scoreLoaded 后提取，UI 只消费 GpTrackInfo
const trackList = ref<GpTrackInfo[]>([])
const trackMode = ref<TrackMode>('single')
// active 集合：实际渲染哪些轨。single 模式保证只有一条，all 模式可多条
const activeTracks = ref<Set<number>>(new Set([0]))
const activeTrack = computed(() => activeTracks.value.values().next().value ?? 0)

let alphatab: typeof import('@coderline/alphatab') | null = null
let api: AtApi | null = null
let soundfontRequested = false
// renderTracks 后 scoreLoaded 会再触发，提取音轨列表必须幂等
let tracksExtracted = false

// 全屏浮层：实例不重建，谱面 DOM 在卡片和浮层容器之间搬运
const fullscreen = ref(false)
const cardScrollWrap = ref<HTMLElement | null>(null) // 卡片里的谱面滚动区
const fsScrollWrap = ref<HTMLElement | null>(null) // 浮层里的谱面滚动区
const expandBtn = ref<HTMLElement | null>(null)
let lastTrigger: HTMLElement | null = null
let cardScale = 1

// 浮层工具条状态（与 alphaTab 运行时属性双向绑定）
const muted = ref<Set<number>>(new Set())
const soloed = ref<Set<number>>(new Set())
const volume = ref(0.8)
const speed = ref(1)
const loop = ref(false)
// 节拍器/预备拍走音量（0 关，alphaTab 没有音高调节）：滑杆直接绑运行时属性
const metronome = ref(0)
const countIn = ref(0)
// 音量面板显隐：点按钮展开，再点收起（同时只开一个）
const showMetroPanel = ref(false)
const showCountInPanel = ref(false)
const scale = ref(1)
const position = ref('')
const audioEl = ref<HTMLAudioElement | null>(null)

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]

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
    // 内容页默认横向版式：小节横向排，不挤竖向空间
    layoutMode: 'horizontal',
  }
  // 回放：soundfont 不在初始化时给，首次点播放再 loadSoundFont，避免访客白下几 MB
  applyColors(display.resources = {})
  return {
    core: { engine: 'svg', useWorkers: true, fontDirectory: FONT_DIRECTORY },
    display,
    player: {
      enablePlayer: true,
      enableCursor: true,
      // 内置自动滚动关掉自己跟随：alphaTab 的滚动容器有缓存，运行时换 scrollElement
      // 不生效（BrowserUiFacade._scrollContainer 无失效）。自己订阅位置事件滚，可靠。
      scrollMode: 'off',
    },
  }
}

// 播放跟随滚动：位置事件触发时把游标带回视口。
// 横向滚谱面自身的横向滚动条，竖排把游标滚到视口中央（最近的滚动祖先：页面或浮层滚动区）。
function followCursor() {
  const bar = host.value?.querySelector('.at-cursor-bar') as HTMLElement | null
  const scroller = host.value
  if (!bar || !scroller) return
  if (liveLayout.value === 'horizontal') {
    const r = bar.getBoundingClientRect()
    const sr = scroller.getBoundingClientRect()
    const margin = Math.abs(SCROLL_OFFSET_X)
    if (r.right > sr.right - margin) scroller.scrollLeft += (r.right - sr.right) + margin
    else if (r.left < sr.left) scroller.scrollLeft -= (sr.left - r.left) + margin
  } else {
    bar.scrollIntoView({ block: 'center', behavior: 'auto' })
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
    // 合成播放与 RSE 音频互斥：播一边先停另一边
    if (audioEl.value && !audioEl.value.paused) audioEl.value.pause()
    api.play()
    // 成功后的 playing 态由 playerStateChanged 置位；失败落 catch
  } catch {
    // 音色下载失败（多半是网络不通）：允许重试，重置后重新走懒加载
    soundfontRequested = false
    state.value = 'error'
  }
}

// RSE 音频开始播时，若合成在播就停掉它
function onAudioPlay() {
  if (api && state.value === 'playing') api.stop()
}

function showError(e: unknown) {
  console.error('[gp-score]', e)
  errored.value = true
}

// 谱面加载失败重试：重置后重走 onMounted 的加载分支
let loadFn: (() => Promise<void>) | null = null
async function retryLoad() {
  errored.value = false
  await loadFn?.()
}

function extractTracks(score: { tracks: AtTrack[] }) {
  if (tracksExtracted) return
  tracksExtracted = true
  trackList.value = score.tracks.map((t, i) => ({
    index: i,
    name: t.name || `音轨 ${i + 1}`,
    shortName: t.shortName || `T${i + 1}`,
  }))
  // tracks="all" 首屏直接全选同屏
  if (trackMode.value === 'all') {
    activeTracks.value = new Set(trackList.value.map(t => t.index))
  }
}

function currentTrackObjects(): AtTrack[] {
  return trackObjects([...activeTracks.value].sort((a, b) => a - b))
}

function renderCurrentTracks() {
  const tracks = currentTrackObjects()
  if (!api || tracks.length === 0) return
  // 切轨不断播：renderTracks 重画后游标按新谱重算继续走
  api.renderTracks(tracks)
}

function switchTrack(index: number) {
  activeTracks.value = new Set([index])
  trackMode.value = 'single'
  renderCurrentTracks()
}

function switchTrackMode(mode: TrackMode) {
  trackMode.value = mode
  if (mode === 'all') {
    activeTracks.value = new Set(trackList.value.map(t => t.index))
  } else {
    // 回单轨：保留当前 active 集合的第一条
    const first = [...activeTracks.value].sort((a, b) => a - b)[0] ?? 0
    activeTracks.value = new Set([first])
  }
  renderCurrentTracks()
}

// 浮层每轨行的 A 键：增减 active 集合，至少保留一条
function toggleActiveTrack(index: number) {
  const next = new Set(activeTracks.value)
  if (next.has(index)) {
    if (next.size <= 1) return
    next.delete(index)
  } else {
    next.add(index)
  }
  activeTracks.value = next
  trackMode.value = next.size > 1 ? 'all' : 'single'
  renderCurrentTracks()
}

// 运行时版式切换：Page 竖排分页 / Horizontal 横向长条（SettingsJson 接受小写字符串）
export type PageLayout = 'page' | 'horizontal'
const PAGE_LAYOUTS: PageLayout[] = ['page', 'horizontal']
const pageLayoutLabel: Record<PageLayout, string> = { page: '垂直于屏幕', horizontal: '水平于屏幕' }
const liveLayout = ref<PageLayout>('horizontal')

function applyLayout(layout: PageLayout) {
  if (!api) return
  liveLayout.value = layout
  api.settings.display.layoutMode = layout
  api.updateSettings()
  api.render()
}

// —— 浮层工具条：每轨 mute/solo、音量、变速、循环、节拍器、预备拍、缩放 ——

function trackObjects(indexes: number[]): AtTrack[] {
  if (!api?.score) return []
  return indexes.map(i => api!.score!.tracks[i]).filter(Boolean) as AtTrack[]
}

function toggleMute(index: number) {
  if (!api) return
  const next = new Set(muted.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  muted.value = next
  api.changeTrackMute(trackObjects([index]), next.has(index))
}

function toggleSolo(index: number) {
  if (!api) return
  const next = new Set(soloed.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  soloed.value = next
  api.changeTrackSolo(trackObjects([index]), next.has(index))
}

function applyVolume() {
  if (!api) return
  volume.value = clampVolume(volume.value)
  api.masterVolume = volume.value
}

function applySpeed() {
  if (!api) return
  speed.value = clampSpeed(speed.value)
  api.playbackSpeed = speed.value
}

function applyLoop() {
  if (api) api.isLooping = loop.value
}

function applyMetronome() {
  if (!api) return
  metronome.value = clampVolume(metronome.value)
  api.metronomeVolume = metronome.value
}

function applyCountIn() {
  if (!api) return
  countIn.value = clampVolume(countIn.value)
  api.countInVolume = countIn.value
}

function applyScale() {
  if (!api) return
  scale.value = clampScale(scale.value)
  api.settings.display.scale = scale.value
  api.updateSettings()
  api.render()
}

function stepScale(delta: number) {
  scale.value = clampScale(Math.round((scale.value + delta) * 10) / 10)
  applyScale()
}

// —— 全屏浮层：搬运谱面 DOM，实例不重建 ——

async function openFullscreen() {
  if (!api || !host.value || fullscreen.value) return
  lastTrigger = (expandBtn.value as HTMLElement | null) ?? (document.activeElement as HTMLElement | null)
  cardScale = scale.value
  // 浮层容器由 v-if 控制，先开浮层等 DOM 落定再搬运（否则 ref 全是 null）
  fullscreen.value = true
  await nextTick()
  if (!fsScrollWrap.value || !host.value || !api) return
  fsScrollWrap.value.appendChild(host.value)
  scale.value = FULLSCREEN_SCALE
  api.settings.display.scale = FULLSCREEN_SCALE
  api.updateSettings()
  api.render()
  document.addEventListener('keydown', onFsKeydown)
}

function closeFullscreen() {
  if (!api || !host.value || !cardScrollWrap.value || !fullscreen.value) return
  cardScrollWrap.value.appendChild(host.value)
  scale.value = cardScale
  api.settings.display.scale = cardScale
  fullscreen.value = false
  api.updateSettings()
  api.render()
  document.removeEventListener('keydown', onFsKeydown)
  // 焦点回放大键（WCAG 2.4.3，抄 ImageLightbox 的做法）
  ;(lastTrigger as HTMLElement | null)?.focus?.()
  lastTrigger = null
}

function onFsKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeFullscreen()
}

onMounted(async () => {
  loadFn = async () => {
    const tex = texSrc.value?.textContent?.trim() ?? ''
    if (!props.src && !tex) return
    try {
      alphatab ??= await import('@coderline/alphatab')
      if (!api) {
        api = new alphatab.AlphaTabApi(host.value!, buildSettings())
        trackMode.value = normalizeTrackMode(props.tracks)
        api.playerStateChanged.on(markPlaying)
        // SVG 图形对读屏零信息（WCAG 1.1.1）：解析出曲名后当文本替代
        api.scoreLoaded.on((score) => {
          host.value!.setAttribute('role', 'img')
          host.value!.setAttribute('aria-label', score.title ? `乐谱：${score.title}` : '乐谱（Guitar Pro）')
          // 不同乐器的轨不连谱线：按相同 MIDI program 分组括号（默认 GroupStaves 会连起来）。
          // BracketExtendMode 只有类型导出，运行时按数值（GroupSimilarInstruments = 2）
          score.stylesheet.bracketExtendMode = 0
          extractTracks(score)
          // renderTracks 会再触发 scoreLoaded，提取幂等。
          // single 模式默认就是首轨，不用调；只有 all 模式需要主动铺全轨
          if (trackMode.value === 'all') renderCurrentTracks()
          else api.render()
        })
        api.renderStarted.on(() => { rendering.value = true })
        api.renderFinished.on(() => { rendering.value = false })
        api.playerPositionChanged.on(e => {
          position.value = `${formatTime(e.currentTime)} / ${formatTime(e.endTime)}`
          followCursor()
        })
        api.error.on((e) => showError(e))
      }

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
  }
  await loadFn()
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
  document.removeEventListener('keydown', onFsKeydown)
  api?.destroy()
  api = null
  probe?.remove()
  probe = null
})
</script>

<template>
  <div class="gp-score my-6 rounded-xl border border-[var(--line-color)] bg-[var(--panel-bg)] px-5 pt-4 pb-3">
    <div ref="cardScrollWrap" class="relative">
      <div ref="host" v-show="!errored" class="overflow-x-auto" />
      <div
        v-if="rendering && !errored"
        class="absolute inset-0 flex items-center justify-center rounded bg-[var(--panel-bg)]/80 text-sm text-[var(--txt-50)]"
      >
        谱面绘制中…
      </div>
    </div>
    <!-- 记谱原文：仅供解析，不展示 -->
    <div ref="texSrc" aria-hidden="true" class="hidden"><slot /></div>
    <div v-if="errored" class="my-2 flex flex-wrap items-center gap-3 text-sm" role="alert">
      <p class="text-[var(--danger)]">谱面加载失败。</p>
      <button class="abc-score-play" @click="retryLoad">
        <Icon name="mdi:reload" class="w-3.5 h-3.5" />
        <span>重试</span>
      </button>
      <a v-if="src" :href="src" download class="underline">点此下载原始乐谱文件</a>
    </div>
    <div v-if="ready && !errored" class="abc-score-bar flex-wrap gap-2">
      <template v-if="trackList.length > 1">
        <select
          v-if="activeTracks.size <= 1"
          :value="activeTrack"
          class="rounded-full bg-[var(--chip-bg)] px-3 py-1 text-xs text-[var(--txt-75)]"
          aria-label="选择音轨"
          @change="switchTrack(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="t in trackList" :key="t.index" :value="t.index">
            {{ t.name }}
          </option>
        </select>
        <span v-else class="px-2 py-1 text-xs text-[var(--txt-50)]">
          {{ activeTracks.size }} 轨同屏
        </span>
        <button
          class="abc-score-play"
          :aria-pressed="trackMode === 'all'"
          :title="trackMode === 'all' ? '切换为单轨显示' : '切换为多轨同屏'"
          @click="switchTrackMode(trackMode === 'all' ? 'single' : 'all')"
        >
          <!-- 括号+谱线：单轨一横，多轨三横（mdi 无现成图标，内联画） -->
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" aria-hidden="true">
            <path d="M8 4 C5.5 4 5.5 4 5.5 7 L5.5 10 C5.5 12 5.5 12 3.5 12 C5.5 12 5.5 12 5.5 14 L5.5 17 C5.5 20 5.5 20 8 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <g v-if="trackMode === 'all'" fill="currentColor">
              <rect x="10" y="6.5" width="10" height="2.2" />
              <rect x="10" y="10.9" width="10" height="2.2" />
              <rect x="10" y="15.3" width="10" height="2.2" />
            </g>
            <rect v-else x="10" y="10.9" width="10" height="2.2" fill="currentColor" />
          </svg>
          <span>{{ trackMode === 'all' ? '单轨' : '多轨' }}</span>
        </button>
      </template>
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
      <span v-if="position" class="px-2 py-1 text-xs tabular-nums text-[var(--txt-50)]">{{ position }}</span>
      <span class="flex-1" />
      <button
        ref="expandBtn"
        class="abc-score-play"
        title="全屏播放器"
        aria-label="打开全屏播放器"
        @click="openFullscreen"
      >
        <Icon name="mdi:fullscreen" class="w-3.5 h-3.5" />
        <span>放大</span>
      </button>
    </div>
    <audio v-if="audio" ref="audioEl" controls :src="audio" class="mt-3 w-full" @play="onAudioPlay" />
  </div>

  <Teleport to="body">
    <div
      v-if="fullscreen"
      class="fixed inset-0 z-[100] flex flex-col bg-[var(--page-bg)]"
      role="dialog"
      aria-modal="true"
      aria-label="乐谱全屏播放器"
    >
      <div class="flex flex-wrap items-center gap-2 border-b border-[var(--line-color)] px-4 py-2">
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
        <span v-if="position" class="px-1 text-xs tabular-nums text-[var(--txt-50)]">{{ position }}</span>
        <label class="flex items-center gap-1 px-1 text-xs text-[var(--txt-50)]">
          音量
          <input
            v-model.number="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-20"
            aria-label="总音量"
            @input="applyVolume"
          >
        </label>
        <label class="flex items-center gap-1 px-1 text-xs text-[var(--txt-50)]">
          速度
          <select
            v-model.number="speed"
            class="rounded-full bg-[var(--chip-bg)] px-2 py-1 text-xs text-[var(--txt-75)]"
            aria-label="播放速度"
            @change="applySpeed"
          >
            <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}x</option>
          </select>
        </label>
        <button class="abc-score-play" :aria-pressed="loop" title="整曲循环" @click="loop = !loop; applyLoop()">
          <Icon name="mdi:repeat" class="w-3.5 h-3.5" />
          <span>循环</span>
        </button>
        <div class="relative">
          <button
            class="abc-score-play"
            :aria-pressed="metronome > 0"
            :title="metronome > 0 ? `节拍器音量 ${Math.round(metronome * 100)}%，点击调节` : '节拍器已关，点击调节音量'"
            @click="showMetroPanel = !showMetroPanel; showCountInPanel = false"
          >
            <Icon name="mdi:metronome" class="w-3.5 h-3.5" />
            <span>节拍器</span>
          </button>
          <div
            v-if="showMetroPanel"
            class="absolute left-0 top-full z-10 mt-1 flex items-center gap-2 rounded-lg border border-[var(--line-color)] bg-[var(--card-bg)] px-3 py-2 shadow-md"
          >
            <input
              v-model.number="metronome"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-24"
              aria-label="节拍器音量，0 为关闭"
              @input="applyMetronome"
            >
            <span class="w-9 text-right text-xs tabular-nums text-[var(--txt-50)]">{{ Math.round(metronome * 100) }}%</span>
          </div>
        </div>
        <div class="relative">
          <button
            class="abc-score-play"
            :aria-pressed="countIn > 0"
            :title="countIn > 0 ? `预备拍音量 ${Math.round(countIn * 100)}%，点击调节` : '预备拍已关，点击调节音量'"
            @click="showCountInPanel = !showCountInPanel; showMetroPanel = false"
          >
            <Icon name="mdi:timer-play-outline" class="w-3.5 h-3.5" />
            <span>预备拍</span>
          </button>
          <div
            v-if="showCountInPanel"
            class="absolute left-0 top-full z-10 mt-1 flex items-center gap-2 rounded-lg border border-[var(--line-color)] bg-[var(--card-bg)] px-3 py-2 shadow-md"
          >
            <input
              v-model.number="countIn"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-24"
              aria-label="预备拍音量，0 为关闭"
              @input="applyCountIn"
            >
            <span class="w-9 text-right text-xs tabular-nums text-[var(--txt-50)]">{{ Math.round(countIn * 100) }}%</span>
          </div>
        </div>
        <div class="flex items-center gap-1 px-1" role="group" aria-label="谱面缩放">
          <button class="abc-score-play" title="缩小" aria-label="缩小谱面" @click="stepScale(-0.1)">
            <Icon name="mdi:minus" class="w-3.5 h-3.5" />
          </button>
          <span class="w-10 text-center text-xs tabular-nums text-[var(--txt-50)]">{{ Math.round(scale * 100) }}%</span>
          <button class="abc-score-play" title="放大" aria-label="放大谱面" @click="stepScale(0.1)">
            <Icon name="mdi:plus" class="w-3.5 h-3.5" />
          </button>
        </div>
        <label class="flex items-center gap-1 px-1 text-xs text-[var(--txt-50)]">
          版式
          <select
            v-model="liveLayout"
            class="rounded-full bg-[var(--chip-bg)] px-2 py-1 text-xs text-[var(--txt-75)]"
            aria-label="谱面版式"
            @change="applyLayout(liveLayout)"
          >
            <option v-for="l in PAGE_LAYOUTS" :key="l" :value="l">{{ pageLayoutLabel[l] }}</option>
          </select>
        </label>
        <span class="flex-1" />
        <button class="abc-score-play" title="关闭（Esc）" aria-label="关闭全屏播放器" @click="closeFullscreen">
          <Icon name="mdi:fullscreen-exit" class="w-3.5 h-3.5" />
          <span>关闭</span>
        </button>
      </div>
      <div v-if="trackList.length > 1" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--line-color)] px-4 py-2">
        <div v-for="t in trackList" :key="t.index" class="flex items-center gap-1 text-xs">
          <button
            class="max-w-32 truncate rounded-full px-2 py-1"
            :class="activeTracks.has(t.index) ? 'bg-[var(--primary)] font-bold text-[var(--btn-solid-fg)]' : 'text-[var(--txt-30)]'"
            :aria-pressed="activeTracks.has(t.index)"
            :title="activeTracks.has(t.index) ? `隐藏 ${t.name}` : `显示 ${t.name}`"
            @click="toggleActiveTrack(t.index)"
          >
            {{ t.name }}
          </button>
          <button
            class="abc-score-play"
            :aria-pressed="muted.has(t.index)"
            :title="`静音 ${t.name}`"
            @click="toggleMute(t.index)"
          >
            <span>M</span>
          </button>
          <button
            class="abc-score-play"
            :aria-pressed="soloed.has(t.index)"
            :title="`独奏 ${t.name}`"
            @click="toggleSolo(t.index)"
          >
            <span>S</span>
          </button>
        </div>
      </div>
      <div ref="fsScrollWrap" class="min-h-0 flex-1 overflow-y-auto px-4 py-3" />
    </div>
  </Teleport>
</template>

<style>
/* 播放游标：alphaTab 只创建透明 div，颜色由网站定（https://www.alphatab.net/docs/tutorial-web/player）。
   不限 .gp-score 作用域：全屏时谱面 DOM 搬进 body 下的浮层，限了作用域游标就没颜色。
   scoped 样式自带组件属性，不会漏到站内其他内容。小节底色淡、拍线用主题主色。 */
.at-cursor-bar {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}
.at-cursor-beat {
  background: var(--primary);
  width: 3px;
}
.at-selection div {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.at-highlight * {
  fill: var(--primary);
  stroke: var(--primary);
}
/* 开关类按键（循环/节拍器/预备拍/M/S）：按下态用主色底。
   Teleport 到 body 的浮层同样带本组件作用域属性，直接匹配即可 */
.abc-score-play[aria-pressed="true"] {
  background: var(--primary);
  color: var(--btn-solid-fg);
}
</style>
