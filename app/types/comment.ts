/** 一条评论（服务端返回的公开字段，不含邮箱） */
export interface CommentData {
  id: string
  slug: string
  nick: string
  link: string
  body: string
  /** 回复目标评论 id；顶层评论为空串 */
  parent: string
  /** 毫秒时间戳 */
  created: number
  /**
   * 访客自己刚发的那一条在本地带上的邮箱，仅用于当场算头像。
   * 服务端从不回传它，所以从接口读到的评论上永远是 undefined。
   */
  email?: string
}
