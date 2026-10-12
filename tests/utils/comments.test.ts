import { describe, it, expect } from 'vitest'
import { formatDateTime, sha256 } from '~/utils/comments'

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

describe('sha256', () => {
  it('与已知向量一致（Gravatar 用的就是这个哈希）', async () => {
    expect(await sha256('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    )
  })

  it('输出 64 位十六进制，且不依赖输入的空白', async () => {
    const digest = await sha256('a@b.com')
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(digest).toBe('fb98d44ad7501a959f3f4f4a3f004fe2d9e581ea6207e218c4b02c08a4d75adf')
  })

  it('相同输入结果稳定，不同输入不同', async () => {
    expect(await sha256('x@y.com')).toBe(await sha256('x@y.com'))
    expect(await sha256('x@y.com')).not.toBe(await sha256('z@y.com'))
  })
})
