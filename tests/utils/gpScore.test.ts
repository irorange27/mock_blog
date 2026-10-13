import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  normalizeLayout,
  DEFAULT_LAYOUT,
  SOUNDFONT_URL,
  FONT_DIRECTORY,
  normalizeTrackMode,
  DEFAULT_TRACK_MODE,
  clampVolume,
  clampSpeed,
  clampScale,
  formatTime,
  followScrollTargetY,
  FULLSCREEN_SCALE,
  CURSOR_ANCHOR_RATIO,
  anchorScroll,
  gpScoreStorageKey,
  loadRememberedScale,
  saveRememberedScale,
  createPlayerId,
  registerPlayer,
  unregisterPlayer,
  requestPlay,
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

describe('播放跟随锚点', () => {
  it('横向锚点在视口左侧，给后续小节留出大部分视口', () => {
    // 早先按「距右缘固定 100px」停靠，628px 视口里只剩 16% 前瞻，
    // 使用者看不到接下来的小节。改成按比例靠左停。
    expect(CURSOR_ANCHOR_RATIO).toBeGreaterThan(0)
    expect(CURSOR_ANCHOR_RATIO).toBeLessThan(0.5)
    // 前瞻至少要有半个视口
    expect(1 - CURSOR_ANCHOR_RATIO).toBeGreaterThanOrEqual(0.5)
  })
})

describe('normalizeTrackMode', () => {
  it('应原样接受合法值', () => {
    expect(normalizeTrackMode('singleTrack')).toBe('singleTrack')
    expect(normalizeTrackMode('multiTrack')).toBe('multiTrack')
  })

  it('对非法/空值回落到默认', () => {
    expect(normalizeTrackMode(undefined)).toBe(DEFAULT_TRACK_MODE)
    expect(normalizeTrackMode('')).toBe(DEFAULT_TRACK_MODE)
    expect(normalizeTrackMode('MultiTrack')).toBe(DEFAULT_TRACK_MODE) // 大小写敏感
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

  it('clampSpeed 把变速钳在 alphaTab 范围 0.125–8', () => {
    expect(clampSpeed(0)).toBe(0.125)
    expect(clampSpeed(0.125)).toBe(0.125)
    expect(clampSpeed(1)).toBe(1)
    expect(clampSpeed(2)).toBe(2)
    expect(clampSpeed(8)).toBe(8)
    expect(clampSpeed(16)).toBe(8)
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

  it('FULLSCREEN_SCALE 默认不放大（1 = 原尺寸）', () => {
    // 进全屏不该强行放大：横排是 7000+px 的长条，放大后一屏能看的小节更少。
    // 想放大由用户自己点 +，倍率按谱面记住（见 loadRememberedScale）。
    expect(FULLSCREEN_SCALE).toBe(1)
  })
})

describe('按谱面记住缩放倍数', () => {
  // vitest 的 nuxt 环境里没有 localStorage（启动时能看到 "localStorage is not available"），
  // 这里塞一个最小实现，让存取逻辑真被测到，而不是跳过。
  const store = new Map<string, string>()
  const stub: Storage = {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => { store.delete(k) },
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
  }
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', stub)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('有 src 时直接用文件路径当 key', () => {
    expect(gpScoreStorageKey('/scores/a.gp', '')).toBe('/scores/a.gp')
    expect(gpScoreStorageKey('/scores/非对称集.gp', 'ignored')).toBe('/scores/非对称集.gp')
  })

  it('没有 src 的内联 alphaTex 用内容哈希，同内容同 key', () => {
    const k1 = gpScoreStorageKey(undefined, '\\title "a"\n. 3.3.4')
    const k2 = gpScoreStorageKey(undefined, '\\title "a"\n. 3.3.4')
    const k3 = gpScoreStorageKey(undefined, '\\title "b"\n. 3.3.4')
    expect(k1).toBe(k2)
    expect(k1).not.toBe(k3)
    expect(k1).toMatch(/^tex:/)
  })

  it('两边都空时没有 key（不记也不读）', () => {
    expect(gpScoreStorageKey(undefined, '')).toBeNull()
    expect(gpScoreStorageKey(undefined, '   ')).toBeNull()
  })

  it('存进去能读回来', () => {
    const key = 'test:roundtrip.gp'
    expect(loadRememberedScale(key)).toBeNull()
    saveRememberedScale(key, 1.5)
    expect(loadRememberedScale(key)).toBe(1.5)
    localStorage.removeItem('blog:gp-score-scale:' + key)
  })

  it('读回时按缩放范围钳制，坏值当没存过', () => {
    const key = 'test:clamp.gp'
    localStorage.setItem('blog:gp-score-scale:' + key, '9')
    expect(loadRememberedScale(key)).toBe(2) // 钳到上限
    localStorage.setItem('blog:gp-score-scale:' + key, '0.01')
    expect(loadRememberedScale(key)).toBe(0.5) // 钳到下限
    localStorage.setItem('blog:gp-score-scale:' + key, 'not-a-number')
    expect(loadRememberedScale(key)).toBeNull()
    localStorage.removeItem('blog:gp-score-scale:' + key)
  })

  it('key 为 null 时读写都安全（不抛）', () => {
    expect(loadRememberedScale(null)).toBeNull()
    expect(() => saveRememberedScale(null, 1.5)).not.toThrow()
  })
})

describe('formatTime', () => {
  it('毫秒转 m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(61000)).toBe('1:01')
    expect(formatTime(3599000)).toBe('59:59')
  })
})

describe('播放互斥 bus', () => {
  it('createPlayerId 每次返回不同 id', () => {
    expect(createPlayerId()).not.toBe(createPlayerId())
  })

  it('requestPlay 只停别人不停自己', () => {
    const stopped: string[] = []
    const a = createPlayerId()
    const b = createPlayerId()
    registerPlayer(a, () => { stopped.push('a') })
    registerPlayer(b, () => { stopped.push('b') })
    requestPlay(a)
    expect(stopped).toEqual(['b'])
    unregisterPlayer(a)
    unregisterPlayer(b)
  })

  it('注销后不再被打扰', () => {
    const stopped: string[] = []
    const a = createPlayerId()
    const b = createPlayerId()
    registerPlayer(a, () => { stopped.push('a') })
    registerPlayer(b, () => { stopped.push('b') })
    unregisterPlayer(b)
    requestPlay(a)
    expect(stopped).toEqual([])
    unregisterPlayer(a)
  })

  it('重复注册覆盖旧回调', () => {
    const stopped: string[] = []
    const a = createPlayerId()
    const b = createPlayerId()
    registerPlayer(a, () => { stopped.push('old') })
    registerPlayer(a, () => { stopped.push('new') })
    registerPlayer(b, () => {})
    requestPlay(b)
    expect(stopped).toEqual(['new'])
    unregisterPlayer(a)
    unregisterPlayer(b)
  })
})


describe('followScrollTargetY', () => {
  it('游标在视口内时不滚动', () => {
    // 游标 100..140 完全落在视口 0..600 内
    expect(followScrollTargetY(100, 140, 0, 600, 0)).toBeNull()
    expect(followScrollTargetY(100, 140, 0, 600, 300)).toBeNull()
  })

  it('游标低于视口时向下滚到中央', () => {
    // 游标中心 700，视口中心 300，scrollTop=0 → 目标 400
    expect(followScrollTargetY(680, 720, 0, 600, 0)).toBe(400)
    // 已有 scrollTop 时在之上叠加同样的差量
    expect(followScrollTargetY(680, 720, 0, 600, 100)).toBe(500)
  })

  it('游标高于视口时向上滚到中央', () => {
    // 游标中心 -20，视口中心 300，scrollTop=500 → 目标 500-320=180
    expect(followScrollTargetY(-40, 0, 0, 600, 500)).toBe(180)
  })

  it('视口高度为 0 时放弃（隐藏容器）', () => {
    expect(followScrollTargetY(10, 20, 100, 100, 0)).toBeNull()
  })

  it('滚动到位后游标正好居中、不再触发滚动', () => {
    // 设 scrollTop=400 后，游标矩形（原 680..720）随之上移 400 → 280..320，
    // 落在视口 0..600 内，应返回 null。这验证"滚到位就停"，不会来回抖。
    expect(followScrollTargetY(280, 320, 0, 600, 400)).toBeNull()
  })
})

describe('anchorScroll', () => {
  const VIEW = 600
  const CONTENT = 3000

  it('把游标钉在视口左侧 anchorRatio 处', () => {
    // 视口宽 600、锚点 0.25 → 游标应停在距左缘 150px
    // 游标在内容里 x=1000 → scrollLeft = 1000 - 150 = 850
    expect(anchorScroll(1000, VIEW, CONTENT, 0.25)).toBe(850)
    // 锚点 0.5（居中）→ 1000 - 300 = 700
    expect(anchorScroll(1000, VIEW, CONTENT, 0.5)).toBe(700)
  })

  it('留出的前瞻就是 (1-ratio) 个视口', () => {
    // 落位后游标的视觉 x = 视口宽 * ratio
    const ratio = 0.25
    const sl = anchorScroll(1000, VIEW, CONTENT, ratio)
    expect(1000 - sl).toBe(VIEW * ratio)
    // 右侧剩余可视宽度 = 视口宽 - 游标位置
    expect(VIEW - (1000 - sl)).toBe(VIEW * (1 - ratio))
  })

  it('谱面开头不越界（scrollLeft 不为负）', () => {
    // 游标还在 x=50，锚点要求滚到 50-150 = -100 → 钳到 0
    expect(anchorScroll(50, VIEW, CONTENT, 0.25)).toBe(0)
  })

  it('谱面末尾不越过可滚范围', () => {
    // 内容 3000、视口 600 → 最大 scrollLeft 2400
    expect(anchorScroll(5000, VIEW, CONTENT, 0.25)).toBe(2400)
  })

  it('内容比视口窄时返回 0（无处可滚）', () => {
    expect(anchorScroll(100, VIEW, 400, 0.25)).toBe(0)
  })

  it('同一位置连续调用结果一致（不会自我拉锯）', () => {
    const a = anchorScroll(1000, VIEW, CONTENT, 0.25)
    const b = anchorScroll(1000, VIEW, CONTENT, 0.25)
    expect(b).toBe(a)
  })
})
