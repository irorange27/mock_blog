// worker 运行时用到的 Cloudflare 类型最小子集。
// 故意不引入 @cloudflare/workers-types：它的全局声明会和 Nuxt 的 DOM lib 冲突，
// 按结构声明即可覆盖本目录的类型检查需求。

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>
}

export interface DurableObjectId {
  toString(): string
}

export interface DurableObjectStub {
  fetch(request: Request | string): Promise<Response>
}

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

export interface SqlStorageCursor<T> {
  toArray(): T[]
}

export interface SqlStorage {
  exec<T = Record<string, unknown>>(sql: string, ...args: unknown[]): SqlStorageCursor<T>
}

export interface DurableObjectState {
  storage: { sql: SqlStorage }
  /** 让响应返回后再跑一段异步（发邮件这类附加能力） */
  waitUntil?: (promise: Promise<unknown>) => void
}

/** DO 构造器的 state 参数本身兼作 ctx：waitUntil 从它身上来 */
export type DurableObjectContext = DurableObjectState

// wrangler.jsonc 中声明的绑定
export interface Env {
  ASSETS: AssetFetcher
  COMMENTS: DurableObjectNamespace
  /** 博主删除评论的令牌；未配置时删除接口整体关闭（501） */
  COMMENT_ADMIN_TOKEN?: string
  /**
   * 发信 binding（Cloudflare Email Routing → 转发到博主 QQ 邮箱）。
   * 未配置时评论照常发表，只是不通知——通知失败不影响评论。
   */
  MAIL?: EmailSender
}

/** send_email binding 的运行时形态：worker/types.ts 手写的最小子集 */
export interface EmailSender {
  send(message: { from: string, to: string, subject: string, text?: string, raw?: string }): Promise<string>
}
