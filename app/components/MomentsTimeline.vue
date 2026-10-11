<script setup lang="ts">
// 动态时间线：倒序平铺。limit 控制条数（不传则全量），供侧栏与 /moments 页复用。
// 正文是 markdown body（frontmatter 之下），body 列随查询取出后交给 ContentRenderer 渲染
interface MomentItem {
  path: string
  title?: string
  date: string
  body: unknown
}

const props = defineProps<{ limit?: number }>()

const { data, status, error, refresh } = useAsyncData(
  `moments-timeline-${props.limit ?? 'all'}`,
  () => {
    let q = queryCollection('moments')
      .select('path', 'title', 'date', 'body')
      .order('date', 'DESC')
    if (props.limit) q = q.limit(props.limit)
    return q.all()
  }
)

const moments = computed(() => data.value || [])

// 示例文件的占位标题不展示
const showTitle = (m: MomentItem) => m.title && m.title !== '动态'

const formatMomentDate = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split('-')
  return year === String(new Date().getFullYear())
    ? `${Number(month)}月${Number(day)}日`
    : `${year}年${Number(month)}月${Number(day)}日`
}
const formatMomentTime = (date: string) => date.slice(11, 16)
</script>

<template>
  <DataState :status="status" :error="error" @retry="refresh">
    <ol v-if="moments.length > 0" class="space-y-5 ml-2 sm:ml-4">
      <li
        v-for="moment in moments"
        :key="moment.path"
        class="pl-4 border-l-2 border-[var(--line-color)] hover:border-[var(--primary)] transition-colors"
      >
        <time :datetime="moment.date" class="block text-xs text-[var(--txt-30)] mb-1.5">
          {{ formatMomentDate(moment.date) }} {{ formatMomentTime(moment.date) }}
        </time>
        <p v-if="showTitle(moment)" class="text-sm font-semibold text-[var(--txt-75)] mb-1.5">
          {{ moment.title }}
        </p>
        <ContentRenderer
          :value="moment"
          class="text-sm text-[var(--txt-50)] leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0"
        />
      </li>
    </ol>

    <div v-else class="text-[var(--txt-50)] text-center py-8">
      暂无动态
    </div>
  </DataState>
</template>
