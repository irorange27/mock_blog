<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'tip' | 'note' | 'important' | 'warning' | 'caution'
  title?: string
}>(), { type: 'note', title: '' })

const META: Record<string, { icon: string; label: string }> = {
  tip: { icon: 'mdi:lightbulb-on-outline', label: '提示' },
  note: { icon: 'mdi:information-outline', label: '说明' },
  important: { icon: 'mdi:star-four-points-outline', label: '重要' },
  warning: { icon: 'mdi:alert-outline', label: '警告' },
  caution: { icon: 'mdi:alert-octagon-outline', label: '谨慎' },
}

const meta = computed(() => META[props.type] ?? META.note)
</script>

<template>
  <div class="adm" :class="`adm-${type}`">
    <div class="adm-title">
      <Icon :name="meta.icon" class="w-4 h-4 shrink-0" />
      <span>{{ title || meta.label }}</span>
    </div>
    <div class="adm-body">
      <slot />
    </div>
  </div>
</template>
