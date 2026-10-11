import { describe, it, expect } from 'vitest'
import { normalizeLayout, DEFAULT_LAYOUT, SOUNDFONT_URL, FONT_DIRECTORY } from '~/utils/gpScore'

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
