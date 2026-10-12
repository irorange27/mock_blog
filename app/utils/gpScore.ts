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

// 横向版式跟随滚动时小节左侧多留的距离，负值让小节停在视口左边缘右侧
export const SCROLL_OFFSET_X = -100

// 全屏浮层默认缩放：地方大，谱面可以比卡片大一档
export const FULLSCREEN_SCALE = 1.2

export type TrackMode = 'single' | 'all'

export const DEFAULT_TRACK_MODE: TrackMode = 'single'

export function normalizeTrackMode(mode: string | undefined): TrackMode {
  if (mode === 'single' || mode === 'all') return mode
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

export function clampSpeed(v: number): number {
  return clamp(v, 0.25, 2)
}

export function clampScale(v: number): number {
  return clamp(v, 0.5, 2)
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
