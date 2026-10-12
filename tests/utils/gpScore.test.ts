import { describe, it, expect } from 'vitest'
import { normalizeLayout, DEFAULT_LAYOUT, SOUNDFONT_URL, FONT_DIRECTORY, SCROLL_OFFSET_Y } from '~/utils/gpScore'

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

describe('自托管资源路径', () => {
  it('SOUNDFONT_URL 指向 public/soundfont 下', () => {
    expect(SOUNDFONT_URL).toMatch(/^\/soundfont\//)
  })

  it('FONT_DIRECTORY 指向 public/fonts/alphatab 下', () => {
    expect(FONT_DIRECTORY).toMatch(/^\/fonts\/alphatab\/$/)
  })
})

describe('播放滚动偏移', () => {
  it('SCROLL_OFFSET_Y 为负：offset 加在滚动目标上，负值才让小节停在视口顶部下方', () => {
    expect(SCROLL_OFFSET_Y).toBeLessThan(0)
  })

  it('偏移绝对值留出吸顶导航加一个小节排面的高度', () => {
    // 吸顶导航 h-14（56px），绝对值必须明显大于它，否则当前小节贴顶被挡
    expect(Math.abs(SCROLL_OFFSET_Y)).toBeGreaterThan(56)
    expect(Number.isInteger(SCROLL_OFFSET_Y)).toBe(true)
  })
})
