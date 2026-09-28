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
}

// wrangler.jsonc 中声明的绑定
export interface Env {
  ASSETS: AssetFetcher
  VIEWS: DurableObjectNamespace
}
