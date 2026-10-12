import { describe, it, expect } from 'vitest'
import {
  normalizeLayout,
  DEFAULT_LAYOUT,
  SOUNDFONT_URL,
  FONT_DIRECTORY,
  SCROLL_OFFSET_Y,
  normalizeTrackMode,
  DEFAULT_TRACK_MODE,
  clampVolume,
  clampSpeed,
  clampScale,
  formatTime,
  SCROLL_OFFSET_Y_FULLSCREEN,
  FULLSCREEN_SCALE,
} from '~/utils/gpScore'

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

  it('浮层偏移同样为负，绝对值只留工具条高度', () => {
    expect(SCROLL_OFFSET_Y_FULLSCREEN).toBeLessThan(0)
    expect(Math.abs(SCROLL_OFFSET_Y_FULLSCREEN)).toBeLessThan(Math.abs(SCROLL_OFFSET_Y))
  })
})

describe('normalizeTrackMode', () => {
  it('应原样接受合法值', () => {
    expect(normalizeTrackMode('single')).toBe('single')
    expect(normalizeTrackMode('all')).toBe('all')
  })

  it('对非法/空值回落到默认', () => {
    expect(normalizeTrackMode(undefined)).toBe(DEFAULT_TRACK_MODE)
    expect(normalizeTrackMode('')).toBe(DEFAULT_TRACK_MODE)
    expect(normalizeTrackMode('All')).toBe(DEFAULT_TRACK_MODE) // 大小写敏感
    expect(normalizeTrackMode('0,2')).toBe(DEFAULT_TRACK_MODE)
  })
})

describe('钳制函数', () => {
  it('clampVolume 把音量钳在 0–1', () => {
    expect(clampVolume(-1)).toBe(0)
    expect(clampVolume(0)).toBe(0)
    expect(clampVolume(0.8)).toBe(0.8)
    expect(clampVolume(1)).toBe(1)
    expect(clampVolume(3)).toBe(1)
  })

  it('clampSpeed 把变速钳在 0.25–2', () => {
    expect(clampSpeed(0)).toBe(0.25)
    expect(clampSpeed(0.25)).toBe(0.25)
    expect(clampSpeed(1)).toBe(1)
    expect(clampSpeed(2)).toBe(2)
    expect(clampSpeed(4)).toBe(2)
  })

  it('clampScale 把缩放钳在 0.5–2', () => {
    expect(clampScale(0.1)).toBe(0.5)
    expect(clampScale(0.5)).toBe(0.5)
    expect(clampScale(1.2)).toBe(1.2)
    expect(clampScale(2)).toBe(2)
    expect(clampScale(5)).toBe(2)
  })

  it('FULLSCREEN_SCALE 落在缩放钳制范围内', () => {
    expect(clampScale(FULLSCREEN_SCALE)).toBe(FULLSCREEN_SCALE)
  })
})

describe('formatTime', () => {
  it('毫秒转 m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(61000)).toBe('1:01')
    expect(formatTime(3599000)).toBe('59:59')
  })
})
