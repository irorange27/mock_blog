import type { CommentData } from '~/types/comment'

export type { CommentData }

interface CommentNode extends CommentData {
  children: CommentNode[]
}

/**
 * 文章评论：读取、发表、博主删除。
 *
 * 与 usePageViews 一致：API 不可用时静默降级（本地 pnpm dev 没有 Worker，
 * 评论区显示为「暂时读不到评论」而不是报错），提交失败则把错误文案回给表单。
 *
 * 身份沿用访客自填的昵称/邮箱/网址，没有服务端会话——防冒充不在本版范围内，
 * 详见 docs/comments.md。邮箱只用于生成头像哈希，服务端不向前端回传。
 */
export function useComments(slug: () => string) {
  const comments = ref<CommentData[]>([])
  const loading = ref(false)
  const submitting = ref(false)
  /** 读取失败（区别于「还没有评论」）：只在列表区域展示，不影响正文 */
  const loadFailed = ref(false)

  // 访客身份记在本地，下次来访不用重填。读写在 localStorage 不可用时静默跳过。
  const identity = reactive({ nick: '', email: '', link: '' })

  const tree = computed<CommentNode[]>(() => buildTree(comments.value))
  const count = computed(() => comments.value.length)

  function loadIdentity() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem('comment-identity')
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<typeof identity>
      identity.nick = typeof saved.nick === 'string' ? saved.nick : ''
      identity.email = typeof saved.email === 'string' ? saved.email : ''
      identity.link = typeof saved.link === 'string' ? saved.link : ''
    } catch {
      // 存储不可用或内容损坏：保持空身份，不影响发表
    }
  }

  function saveIdentity() {
    if (!import.meta.client) return
    try {
      localStorage.setItem('comment-identity', JSON.stringify({ ...identity }))
    } catch {
      // 同上：存不下就每次重填
    }
  }

  /** 拉取当前文章的评论；切换文章时由 watch 重新调用 */
  async function refresh() {
    const target = slug()
    if (!import.meta.client || !target) return

    loading.value = true
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(target)}`)
      if (!res.ok) {
        loadFailed.value = true
        return
      }
      const data = (await res.json()) as { comments?: unknown }
      if (!Array.isArray(data.comments)) {
        loadFailed.value = true
        return
      }
      // 期间切换了文章：结果作废，避免串台
      if (target !== slug()) return
      comments.value = data.comments.filter(isCommentData)
      loadFailed.value = false
    } catch {
      loadFailed.value = true
    } finally {
      loading.value = false
    }
  }

  /** 返回 null 表示成功，否则返回可展示的错误文案 */
  async function submit(body: string, parent = ''): Promise<string | null> {
    const target = slug()
    if (!target) return '文章路径无效'

    submitting.value = true
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(target)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: target,
          nick: identity.nick,
          email: identity.email,
          link: identity.link,
          body,
          parent,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as { comment?: unknown; error?: unknown }
      if (!res.ok) {
        return typeof data.error === 'string' ? data.error : '评论发送失败'
      }

      if (isCommentData(data.comment)) {
        // 本地带上邮箱，让自己刚发的那条当场就有头像；服务端不会回传它。
        comments.value = [...comments.value, { ...data.comment, email: identity.email }]
      } else {
        await refresh()
      }
      saveIdentity()
      return null
    } catch {
      return '网络异常，评论未发送'
    } finally {
      submitting.value = false
    }
  }

  /** 博主删除：令牌由本地填写，失败时返回错误文案 */
  async function remove(id: string, token: string): Promise<string | null> {
    submitting.value = true
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-comment-token': token },
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown }
        return typeof data.error === 'string' ? data.error : '删除失败'
      }
      // 主楼删除会连带删掉回复，本地同步过滤掉这一支
      comments.value = comments.value.filter((c) => c.id !== id && c.parent !== id)
      return null
    } catch {
      return '网络异常，删除未生效'
    } finally {
      submitting.value = false
    }
  }

  if (import.meta.client) {
    loadIdentity()
    watch(slug, () => {
      comments.value = []
      loadFailed.value = false
      void refresh()
    }, { immediate: true })
  }

  return { comments, tree, count, loading, submitting, loadFailed, identity, refresh, submit, remove }
}

/**
 * 拍平成两层：主楼 + 挂在它下面的回复。
 * 数据层不限制嵌套深度，多级回复全部归到其主楼之下（parent 指向回复时向上找根）。
 */
function buildTree(flat: CommentData[]): CommentNode[] {
  const byId = new Map<string, CommentNode>()
  for (const item of flat) {
    byId.set(item.id, { ...item, children: [] })
  }

  const roots: CommentNode[] = []
  for (const item of flat) {
    const node = byId.get(item.id)!
    const parent = item.parent ? byId.get(item.parent) : undefined
    if (!parent) {
      roots.push(node)
      continue
    }
    // parent 指向的是一条回复：归到它所属的主楼下面
    const root = findRoot(byId, parent)
    root.children.push(node)
  }

  return roots
}

function findRoot(byId: Map<string, CommentNode>, node: CommentNode): CommentNode {
  const seen = new Set<string>([node.id])
  let current = node
  while (current.parent) {
    const parent = byId.get(current.parent)
    if (!parent || seen.has(parent.id)) break
    seen.add(parent.id)
    current = parent
  }
  return current
}

function isCommentData(value: unknown): value is CommentData {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  return typeof c.id === 'string'
    && typeof c.nick === 'string'
    && typeof c.body === 'string'
    && typeof c.parent === 'string'
    && typeof c.created === 'number'
}
