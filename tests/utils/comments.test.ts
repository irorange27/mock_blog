import { describe, it, expect } from 'vitest'
import { formatDateTime } from '~/utils/comments'

describe('formatDateTime', () => {
  const now = Date.now()

  it('一分钟内显示「刚刚」', () => {
    expect(formatDateTime(now - 30_000)).toBe('刚刚')
  })

  it('一小时内显示分钟', () => {
    expect(formatDateTime(now - 5 * 60_000)).toBe('5 分钟前')
  })

  it('一天内显示小时', () => {
    expect(formatDateTime(now - 3 * 3_600_000)).toBe('3 小时前')
  })

  it('超过一天显示具体日期', () => {
    const old = new Date(now - 5 * 86_400_000)
    expect(formatDateTime(old.getTime())).toBe(
      `${old.getFullYear()} 年 ${old.getMonth() + 1} 月 ${old.getDate()} 日`,
    )
  })

  it('非法时间戳返回空串', () => {
    expect(formatDateTime(0)).toBe('')
    expect(formatDateTime(Number.NaN)).toBe('')
  })
})

