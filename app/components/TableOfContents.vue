<script setup lang="ts">
import type { TableOfContentsItem } from '~/types/post'

const props = defineProps<{
  toc?: TableOfContentsItem[]
  title?: string
}>()

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
  <nav v-if="headings.length" class="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
    <h2 class="text-lg font-bold mb-3 dark:text-gray-100">{{ title || '目录' }}</h2>
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
  </nav>
</template>
