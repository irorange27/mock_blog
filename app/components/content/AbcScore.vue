<script setup lang="ts">
// ::abc-score — 渲染乐谱并支持合成播放。
// 用法：组件内放一个无语言标注的围栏代码块，内容为 ABC 记谱。
// abcjs 体量大且依赖浏览器 API，全部动态 import，不进 SSR 包。
const props = withDefaults(defineProps<{
  scale?: number
}>(), { scale: 1 })

const src = ref<HTMLElement | null>(null)
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')

let abcjs: typeof import('abcjs') | null = null
let abcCode = ''
let visualObj: any = null
let synth: any = null
let endTimer: ReturnType<typeof setTimeout> | null = null

function inkColor() {
  return getComputedStyle(host.value!).getPropertyValue('--txt-75').trim() || '#000'
}

// 只能从原始字符串重渲染：传已编译的 visualObj 会渲染失败
function renderScore() {
  if (!abcjs || !abcCode) return
  visualObj = abcjs.renderAbc(host.value!, abcCode, {
    responsive: 'resize',
    scale: props.scale,
    foregroundColor: inkColor(),
  })[0] ?? null
}

onMounted(async () => {
  abcCode = src.value?.textContent?.trim() ?? ''
  if (!abcCode) return
  abcjs = await import('abcjs')
  renderScore()
  ready.value = true
})

// 乐谱颜色是渲染时烘进 SVG 的，主题切换需要重绘
const colorMode = useColorMode()
watch(colorMode, () => renderScore())

onBeforeUnmount(() => {
  if (endTimer) clearTimeout(endTimer)
  synth?.stop()
})

async function togglePlay() {
  if (state.value === 'playing') {
    synth.stop()
    if (endTimer) clearTimeout(endTimer)
    state.value = 'idle'
    return
  }
  if (!abcjs || !visualObj) return
  state.value = 'loading'
  try {
    if (!synth) {
      synth = new abcjs.synth.CreateSynth()
      await synth.init({
        visualObj,
        options: { soundFontUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM' },
      })
      await synth.prime()
    }
    synth.start()
    state.value = 'playing'
    // CreateSynth 无结束回调，按曲长定时复位（synth.duration 在 prime 后可用，单位秒）
    const ms = ((synth.duration ?? 0) * 1000) | 0
    if (endTimer) clearTimeout(endTimer)
    endTimer = setTimeout(() => { state.value = 'idle' }, ms + 500)
  } catch {
    // 音色下载失败（多半是网络不通）：置为错误态允许点击重试
    synth = null
    state.value = 'error'
  }
}
</script>

<template>
  <div class="abc-score">
    <!-- 记谱原文：仅供解析，不展示 -->
    <div ref="src" aria-hidden="true" class="abc-score-src"><slot /></div>
    <div ref="host" class="abc-score-svg" />
    <div v-if="ready" class="abc-score-bar">
      <button class="abc-score-play" :class="{ 'abc-score-play-err': state === 'error' }" :disabled="state === 'loading'" @click="togglePlay">
        <Icon :name="state === 'playing' ? 'mdi:stop' : state === 'error' ? 'mdi:alert-outline' : 'mdi:play'" class="w-3.5 h-3.5" :class="{ 'ml-0.5': state !== 'playing' && state !== 'error' }" />
        <span>{{ state === 'playing' ? '停止' : state === 'loading' ? '加载音色…' : state === 'error' ? '音色加载失败，点击重试' : '播放' }}</span>
      </button>
    </div>
  </div>
</template>
