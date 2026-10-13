// ::gp-score 组件的纯逻辑。alphaTab 本体在组件里动态 import，这里保持零依赖可单测。

// 自托管资源：字体在 public/fonts/alphatab（alphaTab 按 Bravura.woff2/woff/otf 文件名
// 拼在 fontDirectory 下加载），soundfont 在 public/soundfont，均拷贝自 @coderline/alphatab 包。
export const FONT_DIRECTORY = '/fonts/alphatab/'
export const SOUNDFONT_URL = '/soundfont/sonivox.sf2'

export type ScoreLayout = 'both' | 'tab' | 'staff'

export const DEFAULT_LAYOUT: ScoreLayout = 'both'

export function normalizeLayout(layout: string | undefined): ScoreLayout {
  if (layout === 'both' || layout === 'tab' || layout === 'staff') return layout
  return DEFAULT_LAYOUT
}

// 横向播放跟随时，拍线停在视口宽度这个比例处（0=最左，1=最右）。
//
// 早先用的是「距右缘固定 100px」的写法：628px 的卡片视口里，游标停在 528px，
// 右侧只剩 100px（16% 视口）是还没弹到的内容——读谱的人几乎看不到接下来的小节，
// 只能在音符马上要响的时候才看见它。这个常量原本的注释写的是「让小节停在视口左边缘
// 右侧」，说明一开始的意图就是靠左停，只是算式落在了右缘。
//
// 现在按比例停：1/4 处 → 75% 的视口留给后续内容，同时又保留 25% 已弹过的谱面
// 供回看。想更多前瞻可以调小，想更多回看可以调大。
export const CURSOR_ANCHOR_RATIO = 0.25

// 把游标钉在滚动容器一侧的 anchorRatio 处，返回目标滚动位置（连续值，含小数）。
// 用于两个方向：横向传宽度、纵向传高度，比例各自不同。
// 结果钳在 [0, 可滚动范围]，到头了就自然停住（谱面开头/末尾不会越界）。
export function anchorScroll(
  cursorSheetPos: number,
  viewSize: number,
  contentSize: number,
  anchorRatio: number,
): number {
  const max = Math.max(0, contentSize - viewSize)
  return clamp(cursorSheetPos - viewSize * anchorRatio, 0, max)
}

// 竖排版式没有横向滚动条：把游标滚到"最近的可滚动祖先"的视口中央。
// scrollIntoView 会连带滚动页面甚至把整个文档顶起来，所以自己找祖先算 scrollTop。
export function nearestScroller(el: Element | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && node.scrollHeight > node.clientHeight) {
      return node as HTMLElement
    }
  }
  return null
}

// 竖排把游标滚到滚动容器中央，同样返回绝对 scrollTop（无需滚动时返回 null）。
export function followScrollTargetY(
  cursorTop: number,
  cursorBottom: number,
  viewTop: number,
  viewBottom: number,
  scrollTop: number,
): number | null {
  const viewHeight = viewBottom - viewTop
  if (viewHeight <= 0) return null
  // 游标上下缘都已露出：不动
  if (cursorTop >= viewTop && cursorBottom <= viewBottom) return null
  return scrollTop + ((cursorTop + cursorBottom) / 2 - (viewTop + viewHeight / 2))
}

// 全屏浮层默认缩放：1 = 原尺寸，不做任何放大。
// 早先这里写死 1.2（"地方大，谱面可以大一档"），但进全屏就强行放大并不好：
// 横排是一条 7000+px 的长条，放大后横向滚动更频繁、一屏能看的小节更少，
// 而"该多大"其实取决于各人的屏幕和阅读习惯，不该由组件替他决定。
// 现在进全屏保持 100%，想放大用工具条上的 +/-，倍率会跨开关记住。
export const FULLSCREEN_SCALE = 1

export type TrackMode = 'singleTrack' | 'multiTrack'

export const DEFAULT_TRACK_MODE: TrackMode = 'singleTrack'

export function normalizeTrackMode(mode: string | undefined): TrackMode {
  if (mode === 'singleTrack' || mode === 'multiTrack') return mode
  return DEFAULT_TRACK_MODE
}

// 浮层音轨列表只消费这个结构，不直接碰 alphaTab 的 Track 类型
export interface GpTrackInfo {
  index: number
  name: string
  shortName: string
}

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min
  return Math.min(max, Math.max(min, v))
}

export function clampVolume(v: number): number {
  return clamp(v, 0, 1)
}

// alphaTab 自己的钳制范围（SynthConstants.MinPlaybackSpeed/MaxPlaybackSpeed）
export const MIN_PLAYBACK_SPEED = 0.125
export const MAX_PLAYBACK_SPEED = 8

export function clampSpeed(v: number): number {
  return clamp(v, MIN_PLAYBACK_SPEED, MAX_PLAYBACK_SPEED)
}

export function clampScale(v: number): number {
  return clamp(v, 0.5, 2)
}

// —— 按谱面记住缩放倍数 ——
//
// 全屏播放器里的 +/- 倍率按「谱面」存下来，下次打开这首（或下次访问站点）直接恢复，
// 不用每回重新调。
//
// key 的选择：有 src 就用文件路径（可读、稳定）；alphaTex 内联谱没有文件名，
// 退回内容哈希——同一段记谱永远得到同一个 key，改内容才会变。

const SCALE_STORAGE_PREFIX = 'blog:gp-score-scale:'

export function gpScoreStorageKey(src: string | undefined, tex: string): string | null {
  if (src) return src
  const text = tex.trim()
  if (!text) return null
  // djb2：够短够稳，只用来做 key，不需要抗碰撞
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `tex:${(h >>> 0).toString(36)}`
}

// 读回记住的倍率。没有记录、值不合法、或浏览器禁用存储时都返回 null（用默认值）。
export function loadRememberedScale(key: string | null): number | null {
  if (!key || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_PREFIX + key)
    if (raw === null) return null
    const v = Number(raw)
    return Number.isFinite(v) ? clampScale(v) : null
  } catch {
    // 隐私模式等场景 localStorage 会抛，静默退回默认值即可
    return null
  }
}

export function saveRememberedScale(key: string | null, value: number): void {
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SCALE_STORAGE_PREFIX + key, String(clampScale(value)))
  } catch {
    // 存不下就算了，不影响当前这次使用
  }
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

// 同一页面多个 gp 卡片的播放互斥：谁要播，先停掉其他已注册的实例。
// 模块级单例，组件 onMounted 注册、onBeforeUnmount 注销。
// stop 回调里调 api.stop() / audio.pause()，对方靠自己的事件驱动回 idle，UI 自动跟。
let nextPlayerId = 0
const playerStops = new Map<number, () => void>()

export function createPlayerId(): number {
  nextPlayerId += 1
  return nextPlayerId
}

export function registerPlayer(id: number, stop: () => void): void {
  playerStops.set(id, stop)
}

export function unregisterPlayer(id: number): void {
  playerStops.delete(id)
}

export function requestPlay(id: number): void {
  for (const [otherId, stop] of playerStops) {
    if (otherId !== id) stop()
  }
}
