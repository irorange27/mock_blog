<script setup lang="ts">
const props = defineProps<{ repo: string }>()

// 兼容 owner/name 和完整链接两种写法
const cleaned = props.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/+$/, '')
const [owner, name] = cleaned.split('/')
const full = owner && name ? `${owner}/${name}` : cleaned

const meta = ref<{ description?: string; stars?: number } | null>(null)

// GitHub 匿名 API 限额 60 次/小时/IP，多卡页面+反复访问很容易打满；
// 每仓库结果缓存进 sessionStorage 一小时，打满或离线时静默退化为静态信息
onMounted(async () => {
  const cacheKey = `gh-meta:${full}`
  const TTL = 60 * 60 * 1000
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const entry = JSON.parse(cached) as { meta: typeof meta.value; t: number }
      if (Date.now() - entry.t < TTL) {
        meta.value = entry.meta
        return
      }
    }
    const res = await fetch(`https://api.github.com/repos/${full}`)
    if (!res.ok) return
    const j = await res.json()
    meta.value = { description: j.description, stars: j.stargazers_count }
    sessionStorage.setItem(cacheKey, JSON.stringify({ meta: meta.value, t: Date.now() }))
  } catch {
    // 离线或限流时只显示静态信息
  }
})
</script>

<template>
  <a :href="`https://github.com/${full}`" target="_blank" rel="noopener noreferrer" class="gh-card">
    <img
      :src="`https://github.com/${owner}.png?size=80`"
      :alt="owner"
      class="w-10 h-10 rounded-full shrink-0"
      loading="lazy"
      width="40"
      height="40"
    >
    <div class="min-w-0 flex-1">
      <p class="flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]">
        <Icon name="mdi:github" class="w-4 h-4 shrink-0" />
        <span class="truncate">{{ full }}</span>
        <span v-if="meta?.stars != null" class="inline-flex items-center gap-0.5 font-normal text-[var(--txt-50)]">
          <Icon name="mdi:star" class="w-3.5 h-3.5 shrink-0" />
          {{ meta.stars }}
        </span>
      </p>
      <p v-if="meta?.description" class="mt-0.5 text-sm text-[var(--txt-50)] truncate">
        {{ meta.description }}
      </p>
    </div>
  </a>
</template>
