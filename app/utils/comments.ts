/**
 * 评论区的展示辅助函数。
 *
 * 放在 app/utils 下走 Nuxt 自动导入，与 formatDate / formatDay 同一位置。
 */

/**
 * 评论时间：刚刚 / N 分钟前 / N 小时前 / 昨天 / 具体日期。
 *
 * 相对时间只覆盖一天以内——再往上「N 天前」对读者没有信息量，
 * 直接给日期更实用。
 */
export const formatDateTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''

  const date = new Date(timestamp)
  const diff = Date.now() - timestamp

  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  if (isYesterday) return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`

  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/**
 * 邮箱 → Gravatar 哈希（SHA-256 十六进制）。
 *
 * 只用 Web Crypto（浏览器与 Node 18+ 都自带），不引 md5 依赖。
 * 非安全上下文（http 的局域网访问）下 crypto.subtle 不可用，此时返回空串，
 * 调用方回退到昵称首字头像，不影响正文与提交。
 */
export const sha256 = async (text: string): Promise<string> => {
  try {
    const data = new TextEncoder().encode(text)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return ''
  }
}

const pad = (value: number): string => value.toString().padStart(2, '0')
