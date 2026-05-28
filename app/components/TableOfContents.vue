<template>
  <nav v-if="headings.length" class="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
    <h2 class="text-lg font-bold mb-3 dark:text-gray-100">{{ title || '目录' }}</h2>
    <ul class="space-y-1">
      <li 
        v-for="heading in headings" 
        :key="heading.id"
        :class="[
          'text-sm',
          heading.level === 'h2' ? 'pl-2' : '',
          heading.level === 'h3' ? 'pl-6' : '',
          heading.level === 'h4' ? 'pl-10' : '',
        ]"
      >
        <a
          :href="`#${heading.id}`"
          class="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {{ heading.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
const props = defineProps({
  toc: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  }
})

const headings = computed(() => {
  if (!props.toc || !Array.isArray(props.toc)) return []
  
  const flatten = (items) => {
    const result = []
    for (const item of items) {
      result.push({
        id: item.id,
        text: item.text,
        level: item.level || item.tag
      })
      if (item.children && item.children.length) {
        result.push(...flatten(item.children))
      }
    }
    return result
  }
  
  return flatten(props.toc)
})
</script>
