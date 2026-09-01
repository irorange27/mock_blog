<script setup lang="ts">
import type { TableOfContentsItem } from '~/types/post'

const props = defineProps<{
  toc?: TableOfContentsItem[]
}>()

const asideRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const isPanelOpen = ref(false)

// 宽屏侧栏目录的折叠状态，记住用户偏好（SSR 首帧始终展开，挂载后再应用偏好）
const ASIDE_COLLAPSED_KEY = 'toc-aside-collapsed'
const isAsideCollapsed = ref(false)

const toggleAside = () => {
  isAsideCollapsed.value = !isAsideCollapsed.value
  localStorage.setItem(ASIDE_COLLAPSED_KEY, isAsideCollapsed.value ? '1' : '0')
}

onMounted(() => {
  if (localStorage.getItem(ASIDE_COLLAPSED_KEY) === '1') {
    isAsideCollapsed.value = true
  }
})

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

const minDepth = computed(() => headings.value.reduce((m, h) => Math.min(m, h.depth), 10))

const numbered = computed(() => {
  let n = 0
  return headings.value.map((h) => ({
    ...h,
    badge: h.depth === minDepth.value ? ++n : 0,
    level: h.depth - minDepth.value,
  }))
})

const { activeId } = useScrollSpy(() => headings.value.map(h => h.id))

// 活动项超出可视范围时，把目录容器滚到活动项居中的位置（只滚容器，不动页面）
const scrollActiveIntoView = async (container: HTMLElement | null) => {
  if (!container || !activeId.value) return
  await nextTick()
  const el = container.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(activeId.value)}"]`)
  if (!el) return
  container.scrollTo({ top: el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
}

watch(activeId, () => scrollActiveIntoView(asideRef.value))

// 打开面板时把当前小节滚到可见位置；Esc 关闭
watch(isPanelOpen, (open) => {
  if (open) {
    scrollActiveIntoView(panelRef.value)
    window.addEventListener('keydown', onKeydown)
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') isPanelOpen.value = false
}

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- ≥2xl：固定在内容区右侧留白处，滚动联动高亮；可折叠并记住偏好 -->
  <aside v-if="headings.length" ref="asideRef" class="toc-aside hidden 2xl:block" aria-label="目录">
    <div class="flex items-center justify-between pl-2 pr-1 mb-1">
      <h2 class="text-sm font-bold text-[var(--txt-90)] py-2">目录</h2>
      <button
        class="w-7 h-7 rounded-md flex items-center justify-center text-[var(--txt-30)] hover:text-[var(--txt-90)] hover:bg-[var(--panel-bg-hover)] transition-colors"
        :aria-expanded="!isAsideCollapsed"
        aria-label="折叠目录"
        @click="toggleAside"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="isAsideCollapsed ? '-rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
    <ul v-if="!isAsideCollapsed">
      <li v-for="h in numbered" :key="h.id">
        <a
          :href="`#${h.id}`"
          :title="h.text"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-bg-hover)]"
          :class="[
            h.level === 1 ? 'pl-4' : '',
            h.level >= 2 ? 'pl-8' : '',
            activeId === h.id ? 'text-[var(--primary)] font-bold' : 'text-[var(--txt-50)]',
          ]"
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
  </aside>

  <!-- <2xl：右下角浮动按钮 + 弹出目录面板，不占用正文流 -->
  <template v-if="headings.length">
    <Transition name="toc-fade">
      <div v-if="isPanelOpen" class="2xl:hidden fixed inset-0 z-[60]" @click="isPanelOpen = false" />
    </Transition>
    <Transition name="toc-pop">
      <div
        v-if="isPanelOpen"
        ref="panelRef"
        role="dialog"
        aria-label="目录"
        class="2xl:hidden fixed z-[70] bottom-36 right-4 sm:right-8 sm:bottom-[9rem] w-72 max-w-[calc(100vw-2rem)] max-h-[55vh] overflow-y-auto widget-card shadow-xl backdrop-blur-md"
      >
        <ul class="p-2">
          <li v-for="h in numbered" :key="h.id">
            <a
              :href="`#${h.id}`"
              :title="h.text"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-bg-hover)]"
              :class="[
                h.level === 1 ? 'pl-4' : '',
                h.level >= 2 ? 'pl-8' : '',
                activeId === h.id ? 'text-[var(--primary)] font-bold' : 'text-[var(--txt-50)]',
              ]"
              @click="isPanelOpen = false"
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
      </div>
    </Transition>
    <button
      class="2xl:hidden fixed z-40 bottom-20 right-4 sm:right-8 sm:bottom-[5.25rem] w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-[var(--card-bg-80)] backdrop-blur border border-[var(--line-color)] text-[var(--txt-30)] hover:text-[var(--primary)] hover:border-[var(--line-strong)] shadow-md transition-all flex items-center justify-center"
      :aria-expanded="isPanelOpen"
      aria-label="目录"
      @click="isPanelOpen = !isPanelOpen"
    >
      <Icon name="mdi:format-list-bulleted" class="w-5 h-5 sm:w-4 sm:h-4" />
    </button>
  </template>
</template>

<style scoped>
.toc-fade-enter-active,
.toc-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.toc-fade-enter-from,
.toc-fade-leave-to {
  opacity: 0;
}

.toc-pop-enter-active,
.toc-pop-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
  transform-origin: bottom right;
}
.toc-pop-enter-from,
.toc-pop-leave-to {
  opacity: 0;
  transform: translateY(0.5rem) scale(0.97);
}
</style>
