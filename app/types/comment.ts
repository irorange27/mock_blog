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
}
