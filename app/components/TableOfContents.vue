<script setup lang="ts">
import type { TableOfContentsItem } from '~/types/post'

const props = defineProps<{
  toc?: TableOfContentsItem[]
  title?: string
}>()

const isExpanded = ref(false)

interface FlatHeading {
  id: string
  text: string
  depth: number
}

const headings = computed<FlatHeading[]>(() => {
  if (!props.toc || !Array.isArray(props.toc)) return []

  const flatten = (items: TableOfContentsItem[]): FlatHeading[] => {
    const result: FlatHeading[] = []
    for (const item of items) {
      result.push({
        id: item.id,
        text: item.text,
        depth: item.depth
      })
      if (item.children?.length) {
        result.push(...flatten(item.children))
      }
    }
    return result
  }

  return flatten(props.toc)
})
</script>

<template>
  <nav v-if="headings.length" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
    <button
      class="w-full flex items-center justify-between p-3 lg:p-4 cursor-pointer lg:cursor-default"
      @click="isExpanded = !isExpanded"
      aria-label="切换目录"
    >
      <h2 class="text-sm lg:text-lg font-bold dark:text-gray-100">{{ title || '目录' }}</h2>
      <svg
        class="w-4 h-4 lg:hidden text-gray-400 transition-transform"
        :class="{ 'rotate-180': isExpanded }"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div
      class="px-3 lg:px-4 pb-3 lg:pb-4"
      :class="[isExpanded ? 'block' : 'hidden', 'lg:block']"
      @click="isExpanded = false"
    >
      <ul class="space-y-1">
        <li
          v-for="heading in headings"
          :key="heading.id"
          :class="[
            'text-sm',
            heading.depth === 2 ? 'pl-2' : '',
            heading.depth === 3 ? 'pl-6' : '',
            heading.depth === 4 ? 'pl-10' : '',
          ]"
        >
          <a
            :href="`#${heading.id}`"
            class="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            {{ heading.text }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
