<script setup lang="ts">
// ::gp-score — 渲染 Guitar Pro 文件（GP3-GP8 的 .gp/.gp5/.gpx 等）或 alphaTex，支持合成回放。
// 用法一：::gp-score{src="/scores/xxx.gp"}，可选 layout="both|tab|staff"、audio="/audio/xxx.mp3"
//   （audio 是 GP8 RSE 导出的整曲音频，和合成回放二选一听）。
// 用法二：组件内放一个无语言标注的围栏代码块，内容为 alphaTex，适合短 riff，无需二进制文件。
// alphaTab 体量大且依赖浏览器 API，动态 import 不进 SSR 包；其 Web Worker / AudioWorklet
// 加载由 nuxt.config 里的 @coderline/alphatab-vite 插件接住。
// 字体与 soundfont 自托管：public/fonts/alphatab、public/soundfont（路径见 app/utils/gpScore.ts）。
import { CURSOR_ANCHOR_RATIO, FONT_DIRECTORY, FULLSCREEN_SCALE, MAX_PLAYBACK_SPEED, MIN_PLAYBACK_SPEED, SOUNDFONT_URL, anchorScroll, clampScale, clampSpeed, clampVolume, createPlayerId, followScrollTargetY, formatTime, gpScoreStorageKey, loadRememberedScale, nearestScroller, normalizeLayout, normalizeTrackMode, registerPlayer, requestPlay, saveRememberedScale, unregisterPlayer, type GpTrackInfo, type ScoreLayout, type TrackMode } from '~/utils/gpScore'

type AtApi = import('@coderline/alphatab').AlphaTabApi
type AtSettingsJson = import('@coderline/alphatab').SettingsJson
type AtResourcesJson = NonNullable<NonNullable<AtSettingsJson['display']>['resources']>
type AtTrack = import('@coderline/alphatab').Track
type AtCursorHandler = import('@coderline/alphatab').ICursorHandler

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
const trackMode = ref<TrackMode>('singleTrack')
// active 集合：实际渲染哪些轨。single 模式保证只有一条，all 模式可多条
const activeTracks = ref<Set<number>>(new Set([0]))
// 单轨/多轨各自记住上次的 active 集合，toggle 切回去时恢复
const remembered: { single: Set<number>; all: Set<number> } = { single: new Set([0]), all: new Set() }
const activeTrack = computed(() => activeTracks.value.values().next().value ?? 0)

let alphatab: typeof import('@coderline/alphatab') | null = null
let api: AtApi | null = null
let soundfontRequested = false
// 时间文本上一次刷新到的秒数：位置事件比 1 秒密集得多，按秒节流
let lastPositionSecond = -1
// renderTracks 后 scoreLoaded 会再触发，提取音轨列表必须幂等
let tracksExtracted = false
// 重绘（切轨/缩放/版式）后要把视口送回原来的位置：alphaTab 换 DOM 会让滚动
// 容器内容高度归零再重建，scrollLeft/scrollTop 被浏览器重置为 0，画面跳回开头。
let pendingRestore: { x: number, y: number } | null = null
// 本实例在页面互斥 bus 里的 id：播之前先停掉其他卡片
const playerId = createPlayerId()
// 平滑拍线游标的实例：api 构造时挂上去，销毁时 onDetach 会停掉内部 rAF
const smoothCursorHandler = createSmoothCursorHandler()

// 停掉本卡片的一切声音：合成 + RSE 音频，供 bus 回调。
//
// 用 pause() 而不是 stop()：alphaTab 的 stop() 会把 tickPosition 归零
// （alphaTab.core.mjs: AlphaSynth.stop() -> this.tickPosition = 0），也就是「回到曲首」。
// 被别的卡片顶掉时，用户在那张谱上的进度就白丢了。pause() 保留位置，UI 上表现为
// 「暂停在当前位置」，再点播放从原处继续。
function stopAllSound() {
  if (api && state.value === 'playing') api.pause()
  if (audioEl.value && !audioEl.value.paused) audioEl.value.pause()
}

// 全屏浮层：实例不重建，谱面 DOM 在卡片和浮层容器之间搬运
const fullscreen = ref(false)
const cardScrollWrap = ref<HTMLElement | null>(null) // 卡片里的谱面滚动区
const fsScrollWrap = ref<HTMLElement | null>(null) // 浮层里的谱面滚动区
const expandBtn = ref<HTMLElement | null>(null)
let lastTrigger: HTMLElement | null = null
let cardScale = 1
// 浮层缩放跨开关记忆：每次进浮层恢复上次的倍率。
// 初值是 FULLSCREEN_SCALE（=1，原尺寸），mount 时若这个谱面存过倍率会覆盖它。
let fsScale = FULLSCREEN_SCALE
// 这个谱面在 localStorage 里的键（src 路径或 alphaTex 内容哈希），mount 时算出来
let scoreStorageKey: string | null = null

// 浮层工具条状态（与 alphaTab 运行时属性双向绑定）
const muted = ref<Set<number>>(new Set())
const soloed = ref<Set<number>>(new Set())
const volume = ref(0.8)
// speed: 预设档位数字，或 'custom'（此时用 customSpeed 的自由输入值）
const speed = ref<number | 'custom'>(1)
const customSpeed = ref(1)
// 常用档位 + 自定义入口（范围 0.125–8，alphaTab 自己的钳制）
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4]
const loop = ref(false)
// 节拍器/预备拍走音量（0 关，alphaTab 没有音高调节）：滑杆直接绑运行时属性
// 节拍器/预备拍走音量（0 关，alphaTab 没有音高调节）：滑杆直接绑运行时属性。
// 默认 0.5：点开面板不用先拖滑杆就能出声
const metronome = ref(0.5)
const countIn = ref(0.5)
// 音量面板显隐：点按钮展开，再点收起（同时只开一个）
const showMetroPanel = ref(false)
const showCountInPanel = ref(false)
const scale = ref(1)
// 时间栏拆成两段存：总时长来自 midiLoaded（载入即可知），当前进度来自
// playerPositionChanged。分开存才能在「还没播放」时也显示正确的总长。
const position = ref('')
const totalTime = ref(0)
const currentTime = ref(0)
// 按秒节流：位置事件一帧可能来好几次，每帧改 Vue 响应式会连带工具条重渲染
function refreshPositionText() {
  const cur = formatTime(currentTime.value)
  const total = totalTime.value > 0 ? formatTime(totalTime.value) : formatTime(currentTime.value)
  position.value = `${cur} / ${total}`
}
const audioEl = ref<HTMLAudioElement | null>(null)


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
    core: {
      engine: 'svg',
      useWorkers: true,
      fontDirectory: FONT_DIRECTORY,
      // 懒加载默认开：谱面按 10 小节一块渲染，滚出视口的块会被 alphaTab 从 DOM
      // 撤走（replaceChildren()）再插回，横向谱面整条都超出卡片宽度，等于每次
      // 播放滚动都在反复增删 SVG，视觉上就是画面闪/抖。谱面总量不大，直接全量进 DOM。
      enableLazyLoading: false,
    },
    display,
    player: {
      enablePlayer: true,
      enableCursor: true,
      // 内置自动滚动关掉自己跟随：alphaTab 的滚动容器有缓存，运行时换 scrollElement
      // 不生效（BrowserUiFacade._scrollContainer 无失效）。自己订阅位置事件滚，可靠。
      scrollMode: 'off',
      // 播放时给当前小节的音符加 at-highlight（fill/stroke 覆盖主题主色）。
      // 那是逐音符改 SVG 属性，小节密集时一帧几十个节点重绘，加剧闪烁。
      enableElementHighlighting: false,
      // 拍线补间由 createSmoothCursorHandler 自己按 rAF 插值（见下），
      // 内置的两种行为都不合用：默认那种的 transition 时长按原速拍长算、
      // 会被下一拍覆盖导致游标回头；关掉那种则每拍瞬移、僵硬。
      enableAnimatedBeatCursor: true,
    },
  }
}

// 播放跟随滚动：位置事件触发时把游标带回视口。
// 横向滚谱面自身的横向滚动条，竖排把游标滚到视口中央（最近的滚动祖先：页面或浮层滚动区）。
//
// 这里踩过的坑，逐条记下来：
// 1) 位置事件一帧来好几次（synth worker postMessage 一次、api 内部 beginInvoke 的
//    rAF 又一次）。原来每事件都 += 滚一次，同一偏移被算两遍，谱面像在抖。
//    改成 rAF 合帧：一帧只算一次，且写绝对目标值而不是累加。
// 2) 一帧内多次 getBoundingClientRect() 混着 scrollLeft 写入会触发同步布局抖动，
//    所以先一次读全（游标矩形 + 容器矩形 + 当前 scrollLeft）再写。
// 3) 跟错元素：.at-cursor-bar 按小节宽度撑开（实测 567px ≈ 整个视口），会同时越过
//    左右两条边界，两个分支轮流命中，scrollLeft 在 0/86 之间来回跳。要跟
//    .at-cursor-beat（3px 的拍线）。
// 4) **驱动频率**：位置事件是「每拍一次」，而拍线是每帧在动。只在位置事件里滚，
//    谱面就变成「憋几帧 → 猛追一次」的锯齿，看起来就是晃。现在改成播放期间每帧
//    都跟（见 startFollowLoop），和拍线补间同一个节奏。
// 5) **静止时不要抢滚动**：谱面刚加载完、还没点播放时，alphaTab 也会推一次
//    playerPositionChanged（生成 MIDI 后定位到第 0 拍）。旧代码在非播放态也调
//    applyFollow，于是锚点把 scrollLeft 从 0 瞬间拽到 17px——页面静止时凭空跳一下，
//    就是「一开始播放时有明显的抖动刷新」。现在非播放态只在「用户 seek 过」时落位，
//    载入阶段一次都不动。
// 6) **别跟用户抢滚动条**：播放中每帧都会把谱面拽回锚点，用户想往后翻看
//    「接下来弹什么」时根本滚不动（实测想滚到 2142 只到 275）。
//    现在用户一旦自己滚（滚轮/触摸/拖动滚动条），跟随就暂停一段时间（见
//    FOLLOW_PAUSE_MS），让他安静地看；超时后自动接回播放位置。
let followFrame = 0
// 用户是否 seek 过（点谱面跳转/点播放）：没 seek 过就不该在静止时改滚动位置
let userSeeked = false
// 跟随后还没接管过：开播第一帧的锚点是「从当前滚动位置滑过去」而不是瞬移，
// 否则点播放的瞬间谱面会硬跳一下（实测 0→17px）。
let followEngaged = false
// 用户手动滚动后，跟随暂停到这个时刻（performance.now 毫秒）为止
let followPausedUntil = 0
// 暂停时长：够看完几小节，又不至于让人以为跟随坏了
const FOLLOW_PAUSE_MS = 4000

// 用户在滚谱面：让位一段时间不跟他抢。滚轮/触摸能直接收到事件；
// 拖动滚动条收不到 wheel，用 scroll 事件配合「不是我们自己写进去的」判断兜住。
function pauseFollowForUser() {
  followPausedUntil = performance.now() + FOLLOW_PAUSE_MS
}

// 我们自己写 scrollLeft 时会置这个标记，用来区分「用户滚的」和「跟随滚的」
let selfScrollAt = 0

// 播放期间常驻的跟随后 rAF 循环。不能只靠 playerPositionChanged：
// 那个每拍才来一次，谱面会攒着不动再一次追一大截。
function startFollowLoop() {
  if (followFrame) return
  const step = () => {
    followFrame = 0
    applyFollow()
    if (state.value === 'playing') followFrame = requestAnimationFrame(step)
  }
  followFrame = requestAnimationFrame(step)
}

function stopFollowLoop() {
  if (followFrame) cancelAnimationFrame(followFrame)
  followFrame = 0
}

// 横向滚动的小数累积器。浏览器的 scrollLeft 只认整数（实测写 100.7 读回 101），
// 而跟随目标是连续的小数：只取整会让谱面「冻结几帧 → 跳一下」地闯。
// 这里把取整丢掉的小数部分留到下一帧续上，保证每帧都在动、总位移不丢。
let scrollCarryX = 0
let scrollCarryY = 0

// 把连续目标写成整数 scrollLeft，余数记进 carry 供下一帧续上
function commitScroll(scroller: HTMLElement, axis: 'x' | 'y', target: number) {
  const rounded = Math.round(target)
  const carry = target - rounded
  if (axis === 'x') {
    scrollCarryX = carry
    if (scroller.scrollLeft !== rounded) scroller.scrollLeft = rounded
  } else {
    scrollCarryY = carry
    if (scroller.scrollTop !== rounded) scroller.scrollTop = rounded
  }
}

function applyFollow() {
  // 用户刚自己滚过：先让位，别把他拽回来
  if (performance.now() < followPausedUntil) return
  // 跟随的是「拍线」（.at-cursor-beat）：alphaTab 给它 3px 宽，跟着播放位置单调
  // 右移，适合当定位基准。
  // 不能用「小节底色」（.at-cursor-bar）：它按当前小节宽度撑开，实测 567px 宽、
  // 和 628px 的视口几乎一样宽，会同时越过左右两条边界，两个分支轮流命中，
  // scrollLeft 在 0 和 86 之间来回跳（页面肉眼看到的就是谱面左右抖）。
  const beat = host.value?.querySelector('.at-cursor-beat') as HTMLElement | null
  if (!beat) return
  const r = beat.getBoundingClientRect()
  // 3px 的线按中心算
  const center = r.left + r.width / 2
  if (liveLayout.value === 'horizontal') {
    const scroller = host.value
    if (!scroller) return
    const sr = scroller.getBoundingClientRect()
    // 拍线在谱面内容坐标（未滚动）里的位置。用「含累积的当前位置」换算：
    // scrollLeft 是整数、累积器里存着没写下去的小数，合起来才是真实的连续位置。
    const cursorSheetX = (scroller.scrollLeft - scrollCarryX) + (center - sr.left)
    // 连续钉在视口左侧 CURSOR_ANCHOR_RATIO 处：右侧留出大部分视口给还没弹到的内容，
    // 否则读谱的人看不见接下来的小节。
    const target = anchorScroll(cursorSheetX, sr.width, scroller.scrollWidth, CURSOR_ANCHOR_RATIO)
    const current = scroller.scrollLeft - scrollCarryX
    // 刚接管时不要瞬移：从当前位置朝目标平滑靠拢（约 0.25s 到位），
    // 避免点播放的瞬间谱面硬跳。到位后进入正常逐帧跟随。
    if (!followEngaged) {
      const diff = target - current
      if (Math.abs(diff) < 0.5) {
        followEngaged = true
      } else {
        selfScrollAt = performance.now()
        commitScroll(scroller, 'x', current + diff * 0.25)
        return
      }
    }
    if (Math.abs(target - current) < 0.01) return
    selfScrollAt = performance.now()
    commitScroll(scroller, 'x', target)
  } else {
    // 竖排：alphaTab 把谱面铺在自己的容器里，容器高度=谱面高，本身不滚；
    // 真正滚的是外层（卡片外页面或浮层的 overflow-y 区）。取最近的滚动祖先。
    // 竖排仍用「出视野才滚、滚到居中」：每拍都强行居中会让整页一直在动，
    // 读起来更累；居中本身已经留了半屏前瞻。
    const scroller = nearestScroller(beat)
    if (!scroller) return
    const sr = scroller.getBoundingClientRect()
    const target = followScrollTargetY(center, center, sr.top, sr.bottom, scroller.scrollTop - scrollCarryY)
    if (target === null) return
    commitScroll(scroller, 'y', target)
  }
}

// 播放状态交给 alphaTab 的事件驱动：stop/自然播完都会走 playerStateChanged 回到 idle。
// PlayerState 只有类型导出，运行时按数值比较（Playing = 1）
function markPlaying(args: { state: import('@coderline/alphatab').PlayerState }) {
  state.value = args.state === 1 ? 'playing' : 'idle'
  // 跟随后与拍线补间同频：播放中每帧都滚，停了就收掉循环
  if (state.value === 'playing') {
    // 每次开播都重新平滑接管一次（暂停一段时间后游标可能已经不在锚点附近）
    followEngaged = false
    startFollowLoop()
  } else {
    stopFollowLoop()
  }
}

// —— 平滑拍线游标 ——
//
// 背景：alphaTab 内置两种拍线行为都不好用。
//  · 默认（enableAnimatedBeatCursor=true）用 CSS transition 从当前音滑到下一个音，
//    但它声明的时长按「原速拍长」算，而更新是按实际播放推的：实测声明 ~590ms、
//    实际间隔 ~300ms，每个音的 transition 都被下一拍覆盖，游标突然变速甚至往回缩
//    （752 → 731），看着就是「每经过一个音符跳一下」。
//  · 关掉动画（=false）则每拍直接把拍线瞬移到该拍坐标，实测每 271ms 跳 38px、
//    中间完全不动——僵硬，且滚动跟随也变成一跳一跳。
//
// 所以这里自己实现一个 ICursorHandler：拍线位置由 requestAnimationFrame 按时间插值
// 连续推进，不依赖 alphaTab 的更新节奏，也就不会被打断、不会瞬移。
// 关键点：alphaTab 只在「新的一拍开始」时才给一次 transitionBeatCursor，所以
// 起点/终点/时长都以那一次调用为准，之后每帧按 elapsed/duration 自己算 x。
// 定位统一走 IContainer.setBounds(x, NaN, NaN, NaN)：NaN 表示沿用原值，
// 纵向位置和缩放都由 alphaTab 自己那套 ScalableHtmlElementContainer 管，不重写。
// alphaTab 的 cursorMode 是数值枚举（只有类型导出，运行时按值比较）：
// Unknown=0, ToNextBext=1, ToEndOfBar=2, ToEndOfBeat=3
const TO_NEXT_BEAT = 1

function createSmoothCursorHandler(): AtCursorHandler {
  let raf = 0
  // 当前这一段补间的起点/终点/时长/开始时刻（performance.now 毫秒）
  let fromX = 0
  let toX = 0
  let spanMs = 0
  let startAt = 0
  // 上一帧写进去的 x，避免重复写样式触发无谓的重绘
  let lastX: number | null = null

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function writeX(beatCursor: { setBounds(x: number, y: number, w: number, h: number): void }, x: number) {
    // setBounds 把 NaN 当「沿用上次的值」，所以一旦算进去 NaN，游标会永久冻在原地。
    // 这里挡一道：非法值直接丢弃，宁可不更新也不要卡死。
    if (!Number.isFinite(x)) return
    // 播放中游标只能往右走。任何回退都是坐标算错，宁可停在原地也不要倒着走
    // （实测「播放不流畅」就是每拍回退 30~38px 造成的）。
    //
    // 这里**不做**「变化太小就跳过」的去重：慢拍里整拍只走 3~4px，每帧 0.06px，
    // 一旦按阈值滤掉就变成整拍静止 617ms（实测），看起来就是卡住。
    // 多写一次同样值的代价远小于卡顿。
    if (lastX !== null && x < lastX) return
    if (lastX !== null && x === lastX) return
    lastX = x
    beatCursor.setBounds(x, NaN, NaN, NaN)
  }

  function frame(beatCursor: { setBounds(x: number, y: number, w: number, h: number): void }) {
    raf = 0
    if (spanMs <= 0) { writeX(beatCursor, toX); return }
    const elapsed = performance.now() - startAt
    if (elapsed >= spanMs) { writeX(beatCursor, toX); return }
    const ratio = elapsed / spanMs
    // linear：和 CSS transition 的 linear 一致，匀速最不容易看出补间痕迹
    writeX(beatCursor, fromX + (toX - fromX) * ratio)
    raf = requestAnimationFrame(() => frame(beatCursor))
  }

  return {
    onAttach() {},
    onDetach() {
      stop()
    },
    // 小节底色照 alphaTab 的做法即时放置：它本来就该跟着小节宽度变化
    placeBarCursor(barCursor, beatBounds) {
      const b = beatBounds.barBounds.masterBarBounds.visualBounds
      barCursor.setBounds(b.x, b.y, b.w, b.h)
    },
    placeBeatCursor(beatCursor, beatBounds, startBeatX) {
      const b = beatBounds.barBounds.masterBarBounds.visualBounds
      beatCursor.setBounds(startBeatX, b.y, 1, b.h)
      // seek / 暂停 / 重绘后的即时落位：直接跳到该拍，不起补间
      stop()
      fromX = toX = startBeatX
      spanMs = 0
      startAt = performance.now()
      lastX = null
      writeX(beatCursor, startBeatX)
    },
    transitionBeatCursor(beatCursor, beatBounds, startBeatX, nextBeatX, duration, cursorMode) {
      const b = beatBounds.barBounds.masterBarBounds.visualBounds
      // 起点用「游标当前实际所在的位置」，不要用 alphaTab 给的 startBeatX。
      // startBeatX 是它按 _previousTick 算出来的理论位置；上一段补间可能已经走到
      // 它前面去了。拿理论值当起点会让游标往回缩（实测每拍回退 30~38px，
      // 就是「播放不流畅」的直接原因）。
      const origin = lastX ?? startBeatX
      // 完整照搬 alphaTab 内置实现的算法（ToNextBeatAnimatingCursorHandler）：
      //   nextBeatX = startBeatX + (nextBeatX - startBeatX) * factor
      //   duration  = duration * factor
      // 距离和时长同步乘 factor —— 两者一起放大，速度才不变、时间轴才对得上。
      //
      // 曾经自作聪明做的两件事，都是错的，别再改回去：
      //  · 把终点钳在小节右缘：距离缩短了却仍用整拍时长，拍线在拍中途就到头
      //    干等（静止 198/241 帧）；改成按 travel 比例缩短时长，又只用一半时间
      //    走完、剩下一半干等 617ms。
      //  · 少乘 factor：拍线每拍只走一半就停住，然后被下一拍拽走，
      //    表现为「拍线和小节底色分开」（初音那张密集总谱上达 87% 的帧）。
      // 结论：这个补偿是自洽的一整套，要么整套抄，要么整套不抄，别只抄一半。
      const factor = cursorMode === TO_NEXT_BEAT ? 2 : 1
      const endX = origin + (nextBeatX - origin) * factor
      const span = duration * factor
      // 不做「收在小节右缘内」的钳制。
      //
      // 试过三次，全部失败，记录在此避免再犯：
      //  1) 只钳位置、时长不变 -> 拍线拍中途顶到右缘干等（静止帧 198/241）
      //  2) 按距离比例缩短时长 -> origin 常已越过 barRight，toX 被 max(origin,..)
      //     抬回 origin，距离 0、时长 0 -> 整拍零写入（实测静默 533ms ×5 次）
      //  3) 不做钳制（现在这样）
      //
      // 根本原因：alphaTab 会主动把拍线送到小节右缘甚至更远（factor=2 的目的就是
      // 「朝下一个音去」），所以 origin 经常已经贴着或越过 barRight。此时任何
      // 「收进小节」的约束都会把距离压成 0，与「匀速走完整拍」直接冲突。
      // alphaTab 原版就是允许越界的，靠它自己的重排条件兜底。
      // 越界量实测 8%（宽小节）~26%（初音那种 68px 的密集小节），换来的是
      // 全程 60fps、零回退、零静默 —— 这个取舍是对的：宁可微微越过，也不要卡。
      toX = endX
      // 把起点摆正（含高度），保证 y/高度跟着当前小节走
      beatCursor.setBounds(origin, b.y, 1, b.h)
      stop()
      fromX = origin
      spanMs = Number.isFinite(span) && span > 0 ? span : 0
      startAt = performance.now()
      writeX(beatCursor, origin)
      if (spanMs > 0) raf = requestAnimationFrame(() => frame(beatCursor))
    },
  }
}

// 重绘前记住滚动位置（renderTracks / updateSettings+render 都会走这里）
function captureScroll() {
  pendingRestore = {
    x: host.value?.scrollLeft ?? 0,
    y: nearestScroller(host.value)?.scrollTop ?? 0,
  }
}

// 重绘后把滚动位置写回去。必须等 DOM 落定：alphaTab 的渲染结果是在
// postRenderFinished 时才 append 进 canvasElement 的，早写会被内容重建冲掉。
function restoreScroll() {
  const saved = pendingRestore
  pendingRestore = null
  // 位置被整体搬动过，小数累积器作废，否则会把上一段的余量加到新位置上
  scrollCarryX = 0
  scrollCarryY = 0
  if (saved) {
    if (saved.x && host.value) host.value.scrollLeft = saved.x
    const scroller = nearestScroller(host.value)
    if (saved.y && scroller) scroller.scrollTop = saved.y
    return
  }
  // 没记过位置（首次渲染完成）：不主动滚，免得载入时把静止的谱面拽一下。
  // 播放中的重绘由 startFollowLoop 每帧接着跟，也不需要在这里补。
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
    // 暂停而不是停止：保留播放位置，再点播放从原处继续。
    // （stop() 会把位置归零回到曲首，见 stopAllSound 的说明）
    api.pause()
    return
  }
  if (state.value === 'loading') return
  state.value = 'loading'
  // 用户主动开播：此后允许在非播放态（暂停/停止）按游标落位；
  // 也立刻结束「让位」状态——他点了播放就是想跟上
  userSeeked = true
  followPausedUntil = 0
  try {
    if (!soundfontRequested) {
      soundfontRequested = true
      api.loadSoundFont(SOUNDFONT_URL, false)
      await waitForSoundfont()
    }
    // 先停掉页面上其他 gp 卡片的声音，再播自己（bus 回调只停别人）
    requestPlay(playerId)
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

// RSE 音频开始播时，先停掉其他卡片，再停自己的合成（若在播）
function onAudioPlay() {
  requestPlay(playerId)
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
  if (trackMode.value === 'multiTrack') {
    activeTracks.value = new Set(trackList.value.map(t => t.index))
    remembered.all = new Set(activeTracks.value)
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
  remembered.single = new Set([index])
  trackMode.value = 'singleTrack'
  renderCurrentTracks()
}

function switchTrackMode(mode: TrackMode) {
  if (mode === trackMode.value) return
  trackMode.value = mode
  // 单轨/多轨各自记住 active 集合，切回去时恢复上次的选择
  if (mode === 'multiTrack') {
    remembered.all = new Set(activeTracks.value)
    activeTracks.value = remembered.single.size > 1 ? new Set(remembered.single) : new Set(remembered.all)
  } else {
    remembered.single = new Set(activeTracks.value)
    activeTracks.value = new Set([[...remembered.all].sort((a, b) => a - b)[0] ?? 0])
  }
  renderCurrentTracks()
}

// 浮层每轨行的轨名按钮：增减 active 集合，至少保留一条；改动同步进当前模式的记忆
function toggleActiveTrack(index: number) {
  const next = new Set(activeTracks.value)
  if (next.has(index)) {
    if (next.size <= 1) return
    next.delete(index)
  } else {
    next.add(index)
  }
  activeTracks.value = next
  if (trackMode.value === 'multiTrack') remembered.all = new Set(next)
  else remembered.single = new Set(next)
  trackMode.value = next.size > 1 ? 'multiTrack' : 'singleTrack'
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
  if (!api || speed.value === 'custom') return
  speed.value = clampSpeed(speed.value)
  customSpeed.value = speed.value
  api.playbackSpeed = speed.value
}

// 自定义变速：number 输入，钳到 alphaTab 范围（0.125–8）
function applyCustomSpeed() {
  if (!api) return
  customSpeed.value = clampSpeed(customSpeed.value)
  api.playbackSpeed = customSpeed.value
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

// 应用缩放。remember=true 表示这是用户在浮层里主动调的倍率，要记进 fsScale
// （供下次进浮层恢复）。进/出浮层时的恢复调用不传，避免把恢复值当用户选择写回。
function applyScale(remember = false) {
  if (!api) return
  scale.value = clampScale(scale.value)
  api.settings.display.scale = scale.value
  if (remember) fsScale = scale.value
  // 缩放是重量级操作：alphaTab 整套重新 layout + 重新生成 SVG 字符串再换掉 DOM
  // 节点，长谱上就是一次明显的卡顿。所以切轨/缩放/版式切换后由 postRenderFinished
  // 把滚动位置送回原处（见 captureScroll/restoreScroll），画面不跳回开头。
  api.updateSettings()
  api.render()
}

function stepScale(delta: number) {
  scale.value = clampScale(Math.round((scale.value + delta) * 10) / 10)
  applyScale(true)
  // 按谱面持久化，下次打开这首（甚至下次访问站点）直接用这个倍率
  saveRememberedScale(scoreStorageKey, scale.value)
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
  scale.value = fsScale
  applyScale()
  document.addEventListener('keydown', onFsKeydown)
}

function closeFullscreen() {
  if (!api || !host.value || !cardScrollWrap.value || !fullscreen.value) return
  cardScrollWrap.value.appendChild(host.value)
  // 先把 fullscreen 置回 false 再 applyScale：
  // applyScale 里有「在浮层里调的就记进 fsScale」的逻辑，若此时 fullscreen 还是 true，
  // 它会把切回卡片的倍率（1）当成用户选择写进 fsScale，把记住的 120% 冲掉——
  // 表现就是「关掉再开又变回 100%，只有刷新后才恢复」。
  fullscreen.value = false
  scale.value = cardScale
  applyScale()
  document.removeEventListener('keydown', onFsKeydown)
  // 焦点回放大键（WCAG 2.4.3，抄 ImageLightbox 的做法）
  ;(lastTrigger as HTMLElement | null)?.focus?.()
  lastTrigger = null
}

function onFsKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeFullscreen()
}

onMounted(async () => {
  registerPlayer(playerId, stopAllSound)
  // 用户自己滚谱面时让位：累积器作废（否则会觉得「拖过去又被弹回一点」），
  // 并暂停跟随几秒，让他能安静地往后翻看接下来的小节。
  const onUserWheelOrTouch = () => {
    scrollCarryX = 0
    pauseFollowForUser()
  }
  // 拖动滚动条 / 键盘滚动不会触发 wheel，用 scroll 事件兜住：
  // 只要不是我们自己刚写进去的（selfScrollAt），就当成用户滚动。
  const onScroll = () => {
    if (performance.now() - selfScrollAt < 120) return
    scrollCarryX = 0
    pauseFollowForUser()
  }
  const scroller = host.value
  scroller?.addEventListener('wheel', onUserWheelOrTouch, { passive: true })
  scroller?.addEventListener('touchstart', onUserWheelOrTouch, { passive: true })
  scroller?.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => {
    scroller?.removeEventListener('wheel', onUserWheelOrTouch)
    scroller?.removeEventListener('touchstart', onUserWheelOrTouch)
    scroller?.removeEventListener('scroll', onScroll)
  })
  loadFn = async () => {
    const tex = texSrc.value?.textContent?.trim() ?? ''
    if (!props.src && !tex) return
    // 这个谱面的存储键算一次即可（src 固定，tex 内容不变）
    scoreStorageKey = gpScoreStorageKey(props.src, tex)
    // 记住过倍率就用它，否则保持 FULLSCREEN_SCALE（=1）
    fsScale = loadRememberedScale(scoreStorageKey) ?? FULLSCREEN_SCALE
    try {
      alphatab ??= await import('@coderline/alphatab')
      if (!api) {
        api = new alphatab.AlphaTabApi(host.value!, buildSettings())
        trackMode.value = normalizeTrackMode(props.tracks)
        api.playerStateChanged.on(markPlaying)
        // 总时长：playerPositionChanged 只在播放/seek 时才推，所以刚载入、还没点播放
        // 的时候时间栏一直是「0:00 / 0:00」（浮层里也一样）。MIDI 一生成好
        // （midiLoaded 带回 endTime）就把总长填上，播放前也能看到曲子多长。
        api.midiLoaded.on((e) => {
          if (!e) return
          totalTime.value = e.endTime
          refreshPositionText()
        })
        // 拍线平滑补间：自定义 handler，见 createSmoothCursorHandler 的说明
        api.customCursorHandler = smoothCursorHandler
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
          if (trackMode.value === 'multiTrack') renderCurrentTracks()
          else api.render()
        })
        api.renderStarted.on(() => { rendering.value = true; captureScroll() })
        api.renderFinished.on(() => { rendering.value = false })
        // 谱面 DOM 在这一刻才全部 append 完，之前写 scrollLeft 会被冲掉
        api.postRenderFinished.on(() => restoreScroll())
        api.playerPositionChanged.on(e => {
          // 总时长以 midiLoaded 为准（那里更早、也更稳）；这里兜底，
          // 万一 midiLoaded 没赶上也能显示出来。
          if (e.endTime > 0 && e.endTime !== totalTime.value) totalTime.value = e.endTime
          // 时间文本按秒更新即可：位置事件一帧可能来好几次，每帧改 Vue 响应式
          // 会连带触发工具条重渲染，也是抖动来源之一。
          const secs = Math.floor(e.currentTime / 1000)
          if (secs !== lastPositionSecond) {
            lastPositionSecond = secs
            currentTime.value = e.currentTime
            refreshPositionText()
          }
          // 播放中的连续跟随由 startFollowLoop 每帧做（位置事件每拍才来一次，
          // 只靠它滚会让谱面「憋几帧再猛追一次」）。
          // 非播放态只在用户真的 seek 过之后才落位：谱面刚载入时 alphaTab 会推一次
          // 初始位置事件，那时锚点会把静止的谱面拽一下（就是开头的抖动刷新）。
          if (state.value !== 'playing' && userSeeked) applyFollow()
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
  unregisterPlayer(playerId)
  document.removeEventListener('keydown', onFsKeydown)
  stopFollowLoop()
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
      <button class="abc-score-play" title="重试加载" data-tip="重试加载" aria-label="重试加载" @click="retryLoad">
        <Icon name="mdi:reload" class="w-3.5 h-3.5" />
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
          :aria-pressed="trackMode === 'multiTrack'"
          :title="trackMode === 'multiTrack' ? '切换为单轨显示' : '切换为多轨同屏'"
          :data-tip="trackMode === 'multiTrack' ? '切换为单轨显示' : '切换为多轨同屏'"
          :aria-label="trackMode === 'multiTrack' ? '切换为单轨显示' : '切换为多轨同屏'"
          @click="switchTrackMode(trackMode === 'multiTrack' ? 'singleTrack' : 'multiTrack')"
        >
          <!-- 连谱号 + 小节线 + 谱表：单轨一行谱表，多轨两行（用户提供的形状，内联画） -->
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" aria-hidden="true">
            <!-- 连谱号主干 -->
            <rect x="7.2" y="4" width="3.6" height="16" fill="currentColor" />
            <!-- 连谱号上下臂与卷边 -->
            <polygon points="7.2,3 12.2,3.4 11.4,5.4 7.2,5.4" fill="currentColor" />
            <polygon points="7.2,21 12.2,20.6 11.4,18.6 7.2,18.6" fill="currentColor" />
            <path d="M11.8 3.6 Q13.2 2.8 13.6 1.6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M11.8 20.4 Q13.2 21.2 13.6 22.4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <!-- 小节线：随谱表行数伸缩 -->
            <rect x="12.6" :y="trackMode === 'multiTrack' ? 5 : 8.6" width="2.2" :height="trackMode === 'multiTrack' ? 14 : 6.8" fill="currentColor" />
            <!-- 谱表：单轨一行居中，多轨两行 -->
            <rect x="15.6" :y="trackMode === 'multiTrack' ? 6 : 9.2" width="6.2" height="3.6" fill="currentColor" />
            <rect v-if="trackMode === 'multiTrack'" x="15.6" y="14.2" width="6.2" height="3.6" fill="currentColor" />
          </svg>
        </button>
      </template>
      <button
        class="abc-score-play"
        :class="{ 'abc-score-play-err': state === 'error' }"
        :disabled="state === 'loading'"
        :title="state === 'playing' ? '暂停' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放'"
        :data-tip="state === 'playing' ? '暂停' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放'"
        :aria-label="state === 'playing' ? '暂停' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放'"
        @click="togglePlay"
      >
        <Icon
          :name="state === 'playing' ? 'mdi:pause' : state === 'error' ? 'mdi:alert-outline' : 'mdi:play'"
          class="w-3.5 h-3.5"
        />
      </button>
      <span v-if="position" class="px-2 py-1 text-xs tabular-nums text-[var(--txt-50)]">{{ position }}</span>
      <span class="flex-1" />
      <button
        ref="expandBtn"
        class="abc-score-play"
        title="全屏播放器" data-tip="全屏播放器"
        aria-label="打开全屏播放器"
        @click="openFullscreen"
      >
        <Icon name="mdi:fullscreen" class="w-3.5 h-3.5" />
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
          :title="state === 'playing' ? '暂停' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放'"
          :aria-label="state === 'playing' ? '暂停' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放'"
          @click="togglePlay"
        >
          <Icon
            :name="state === 'playing' ? 'mdi:pause' : state === 'error' ? 'mdi:alert-outline' : 'mdi:play'"
            class="w-3.5 h-3.5"
          />
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
          <span class="w-8 text-right tabular-nums">{{ Math.round(volume * 100) }}%</span>
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
            <option value="custom">自定义…</option>
          </select>
          <input
            v-if="speed === 'custom'"
            ref="speedInput"
            v-model.number="customSpeed"
            type="number"
            :min="MIN_PLAYBACK_SPEED"
            :max="MAX_PLAYBACK_SPEED"
            step="0.05"
            class="w-16 rounded-full bg-[var(--chip-bg)] px-2 py-1 text-xs text-[var(--txt-75)]"
            aria-label="自定义播放速度倍率"
            @change="applyCustomSpeed"
          >
        </label>
        <button class="abc-score-play" :aria-pressed="loop" title="整曲循环" data-tip="整曲循环" aria-label="整曲循环" @click="loop = !loop; applyLoop()">
          <Icon name="mdi:repeat" class="w-3.5 h-3.5" />
        </button>
        <div class="relative">
          <button
            class="abc-score-play"
            :aria-pressed="metronome > 0"
            :title="metronome > 0 ? `节拍器音量 ${Math.round(metronome * 100)}%，点击调节` : '节拍器已关，点击调节音量'"
            :data-tip="metronome > 0 ? `节拍器音量 ${Math.round(metronome * 100)}%，点击调节` : '节拍器已关，点击调节音量'"
            :aria-label="metronome > 0 ? `节拍器音量 ${Math.round(metronome * 100)}%，点击调节` : '节拍器已关，点击调节音量'"
            @click="showMetroPanel = !showMetroPanel; showCountInPanel = false"
          >
            <Icon name="mdi:metronome" class="w-3.5 h-3.5" />
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
            :data-tip="countIn > 0 ? `预备拍音量 ${Math.round(countIn * 100)}%，点击调节` : '预备拍已关，点击调节音量'"
            :aria-label="countIn > 0 ? `预备拍音量 ${Math.round(countIn * 100)}%，点击调节` : '预备拍已关，点击调节音量'"
            @click="showCountInPanel = !showCountInPanel; showMetroPanel = false"
          >
            <Icon name="mdi:timer-play-outline" class="w-3.5 h-3.5" />
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
          <button class="abc-score-play" title="缩小" data-tip="缩小谱面" aria-label="缩小谱面" @click="stepScale(-0.1)">
            <Icon name="mdi:minus" class="w-3.5 h-3.5" />
          </button>
          <span class="w-10 text-center text-xs tabular-nums text-[var(--txt-50)]">{{ Math.round(scale * 100) }}%</span>
          <button class="abc-score-play" title="放大" data-tip="放大谱面" aria-label="放大谱面" @click="stepScale(0.1)">
            <Icon name="mdi:plus" class="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          v-if="trackList.length > 1"
          class="abc-score-play"
          :aria-pressed="trackMode === 'multiTrack'"
          :title="trackMode === 'multiTrack' ? '切换为单轨显示' : '切换为多轨同屏'"
          :aria-label="trackMode === 'multiTrack' ? '切换为单轨显示' : '切换为多轨同屏'"
          @click="switchTrackMode(trackMode === 'multiTrack' ? 'singleTrack' : 'multiTrack')"
        >
          <!-- 连谱号 + 小节线 + 谱表：单轨一行居中，多轨两行（与常态条同形） -->
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" aria-hidden="true">
            <rect x="7.2" y="4" width="3.6" height="16" fill="currentColor" />
            <polygon points="7.2,3 12.2,3.4 11.4,5.4 7.2,5.4" fill="currentColor" />
            <polygon points="7.2,21 12.2,20.6 11.4,18.6 7.2,18.6" fill="currentColor" />
            <path d="M11.8 3.6 Q13.2 2.8 13.6 1.6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M11.8 20.4 Q13.2 21.2 13.6 22.4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <rect x="12.6" :y="trackMode === 'multiTrack' ? 5 : 8.6" width="2.2" :height="trackMode === 'multiTrack' ? 14 : 6.8" fill="currentColor" />
            <rect x="15.6" :y="trackMode === 'multiTrack' ? 6 : 9.2" width="6.2" height="3.6" fill="currentColor" />
            <rect v-if="trackMode === 'multiTrack'" x="15.6" y="14.2" width="6.2" height="3.6" fill="currentColor" />
          </svg>
        </button>
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
        <button class="abc-score-play" title="关闭（Esc）" data-tip="关闭全屏播放器" aria-label="关闭全屏播放器" @click="closeFullscreen">
          <Icon name="mdi:fullscreen-exit" class="w-3.5 h-3.5" />
        </button>
      </div>
      <div v-if="trackList.length > 1" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--line-color)] px-4 py-2">
        <div v-for="t in trackList" :key="t.index" class="flex items-center gap-1 text-xs">
          <button
            class="max-w-32 truncate rounded-full px-2 py-1"
            :class="activeTracks.has(t.index) ? 'bg-[var(--primary)] font-bold text-[var(--btn-solid-fg)]' : 'text-[var(--txt-30)]'"
            :aria-pressed="activeTracks.has(t.index)"
            :title="activeTracks.has(t.index) ? `隐藏 ${t.name}` : `显示 ${t.name}`"
            :data-tip="activeTracks.has(t.index) ? `隐藏 ${t.name}` : `显示 ${t.name}`"
            @click="toggleActiveTrack(t.index)"
          >
            {{ t.name }}
          </button>
          <button
            class="abc-score-play"
            :aria-pressed="muted.has(t.index)"
            :title="`静音 ${t.name}`"
            :data-tip="`静音 ${t.name}`"
            :aria-label="`静音 ${t.name}`"
            @click="toggleMute(t.index)"
          >
            <Icon name="mdi:volume-off" class="w-3.5 h-3.5" />
          </button>
          <button
            class="abc-score-play"
            :aria-pressed="soloed.has(t.index)"
            :title="`独奏 ${t.name}`"
            :data-tip="`独奏 ${t.name}`"
            :aria-label="`独奏 ${t.name}`"
            @click="toggleSolo(t.index)"
          >
            <Icon name="mdi:headphones" class="w-3.5 h-3.5" />
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
/* 图标按钮的快速提示：浏览器原生 title 要悬停 1 秒以上才显示，这里用 CSS
   tooltip 0.3s 就出。文字仍写 title/aria-label（读屏用），这里只加速视觉提示 */
.abc-score-play[data-tip] {
  position: relative;
}
.abc-score-play[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--txt-90);
  color: var(--page-bg);
  font-size: 0.7rem;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.15s;
  z-index: 120;
}
.abc-score-play[data-tip]:hover::after {
  opacity: 1;
}
</style>
