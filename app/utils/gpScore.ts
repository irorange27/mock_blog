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
