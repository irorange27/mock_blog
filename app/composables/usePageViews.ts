// 文章页阅读量：客户端进入文章时向 Worker API 上报一次（POST），并展示最新计数。
// 同一标签页会话内重复访问同一篇只读取（GET）不再计数；API 不可用时静默隐藏。
export function usePageViews(slug: () => string) {
  const views = ref<number | null>(null)

  if (import.meta.client) {
    let seq = 0
    watch(slug, async (value) => {
      const reqId = ++seq
      views.value = null
      if (!value) return

      const key = `pageview:${value}`
      let counted = false
      try {
        counted = sessionStorage.getItem(key) === '1'
      } catch {
        // 受限环境仍可读取阅读量，但无法在此标签页持久化去重状态。
      }

      try {
        const res = await fetch(`/api/views/${encodeURIComponent(value)}`, {
          method: counted ? 'GET' : 'POST',
        })
        if (!res.ok) return

        if (!counted) {
          try {
            sessionStorage.setItem(key, '1')
          } catch {
            // 存储不可用时，后续访问可能再次计数；统计仍保持近似口径。
          }
        }

        const data = (await res.json()) as { views?: unknown }
        if (reqId !== seq) return
        if (typeof data.views === 'number' && Number.isSafeInteger(data.views) && data.views >= 0) {
          views.value = data.views
        }
      } catch {
        // 静默：无后端或网络异常时不展示阅读量，不影响正文
      }
    }, { immediate: true })
  }

  return { views }
}
