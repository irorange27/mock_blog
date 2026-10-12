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

// 播放自动滚动时视口顶部多留的距离：吸顶导航 56px + 约一个小节排面高度，
// 避免当前小节贴顶被导航挡住（alphaTab 的 player.scrollOffsetY）。
// 注意符号：offset 加在目标滚动位置上，负值才让小节停在视口顶部下方。
export const SCROLL_OFFSET_Y = -220

// 全屏浮层里的滚动偏移：没有吸顶导航挡，只留浮层工具条的高度
export const SCROLL_OFFSET_Y_FULLSCREEN = -80

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
