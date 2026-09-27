<script setup lang="ts">
// 目录列表渲染：TableOfContents 的侧栏与浮动面板共用，去掉两份近似 40 行的重复模板。
// navigate 事件供面板关闭用，侧栏可不监听。
interface TocEntry {
  id: string
  text: string
  depth: number
  badge: number
  level: number
}

defineProps<{
  items: TocEntry[]
  activeId: string | null
}>()

defineEmits<{ navigate: [] }>()
</script>

<template>
  <ul>
    <li v-for="h in items" :key="h.id">
      <a
        :href="`#${h.id}`"
        :title="h.text"
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-bg-hover)]"
        :class="[
          h.level === 1 ? 'pl-4' : '',
          h.level >= 2 ? 'pl-8' : '',
          activeId === h.id ? 'text-[var(--primary)] font-bold' : 'text-[var(--txt-50)]',
        ]"
        @click="$emit('navigate')"
      >
        <span
          v-if="h.level === 0"
          class="w-5 h-5 shrink-0 rounded-md text-[11px] flex items-center justify-center font-bold transition-colors"
          :class="activeId === h.id
            ? 'bg-[var(--primary)] text-[var(--btn-solid-fg)]'
            : 'bg-[var(--chip-bg)] text-[var(--primary)]'"
        >{{ h.badge }}</span>
        <span
          v-else-if="h.level === 1"
          class="w-2 h-2 shrink-0 rounded-full transition-colors"
          :class="activeId === h.id ? 'bg-[var(--primary)]' : 'bg-[var(--chip-bg-hover)]'"
        ></span>
        <span
          v-else
          class="w-1.5 h-1.5 shrink-0 rounded-[2px] transition-colors"
          :class="activeId === h.id ? 'bg-[var(--primary)]' : 'bg-[var(--line-strong)]'"
        ></span>
        <span class="truncate">{{ h.text }}</span>
      </a>
    </li>
  </ul>
</template>
