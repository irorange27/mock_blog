<script setup lang="ts">
// 列表类卡片的加载/错误/内容三态（CategoriesCard / TagCard / archives 共用）。
// large = 归档页样式：更大的 spinner、居中的实心重试按钮；默认是侧栏卡片样式。
withDefaults(defineProps<{
  status: string
  error?: { message?: string } | null
  large?: boolean
}>(), { error: null, large: false })

defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="status === 'pending'" class="flex justify-center items-center" :class="large ? 'py-8' : 'py-4'">
    <div
      class="animate-spin rounded-full border-t-2 border-b-2 border-[var(--btn-solid-bg)]"
      :class="large ? 'h-8 w-8' : 'h-5 w-5'"
    />
  </div>

  <div v-else-if="error" class="text-[var(--danger)]" :class="large ? 'text-center py-8' : 'py-4 text-sm'">
    <p>{{ error.message }}</p>
    <button
      class="text-[var(--primary)]"
      :class="large
        ? 'mt-2 px-4 py-2 bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)] rounded hover:bg-[var(--btn-solid-bg-hover)] no-underline'
        : 'mt-1 underline'"
      @click="$emit('retry')"
    >
      重试
    </button>
  </div>

  <slot v-else />
</template>
