import type { DurableObjectState } from './types'

interface ViewRow {
  count: number
}

// 每篇文章有独立 DO，因此对象内只需保存一个计数。
export class ViewCounter {
  private readonly sql: DurableObjectState['storage']['sql']

  constructor(state: DurableObjectState) {
    this.sql = state.storage.sql
    this.sql.exec(
      'CREATE TABLE IF NOT EXISTS views (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL DEFAULT 0)',
    )
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/increment' && request.method === 'POST') {
      this.sql.exec(
        'INSERT INTO views (id, count) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1',
      )
    } else if (url.pathname !== '/count' || request.method !== 'GET') {
      return Response.json({ error: 'not found' }, { status: 404 })
    }

    const rows = this.sql.exec<ViewRow>('SELECT count FROM views WHERE id = 1').toArray()
    return Response.json(
      { views: rows[0]?.count ?? 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
