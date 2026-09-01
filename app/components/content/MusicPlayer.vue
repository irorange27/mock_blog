<script setup lang="ts">
// ::music-player — 站内音频播放器（wavesurfer.js 波形）。
// 音频文件放 public/audio/，src 以站点根路径引用（/audio/xxx.wav）。
const props = withDefaults(defineProps<{
  src: string
  title?: string
  artist?: string
  cover?: string
}>(), { title: '', artist: '', cover: '' })

const waveHost = ref<HTMLElement | null>(null)
const ready = ref(false)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)

let ws: any = null

function waveColors() {
  const cs = getComputedStyle(waveHost.value!)
  return {
    waveColor: cs.getPropertyValue('--line-strong').trim(),
    progressColor: cs.getPropertyValue('--primary').trim(),
  }
}

onMounted(async () => {
  const { default: WaveSurfer } = await import('wavesurfer.js')
  ws = WaveSurfer.create({
    container: waveHost.value!,
    url: props.src,
    height: 56,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    cursorWidth: 0,
    normalize: true,
    ...waveColors(),
  })
  ws.on('ready', () => {
    ready.value = true
    duration.value = ws.getDuration()
  })
  ws.on('timeupdate', (t: number) => { current.value = t })
  ws.on('play', () => { playing.value = true })
  ws.on('pause', () => { playing.value = false })
  ws.on('finish', () => { playing.value = false })
})

// 波形颜色画进 canvas，主题切换后需要重着色
const colorMode = useColorMode()
watch(colorMode, () => ws?.setOptions(waveColors()))

onBeforeUnmount(() => ws?.destroy())

function fmt(s: number) {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
</script>

<template>
  <div class="music-player" role="group" :aria-label="`音频播放器：${title || src}`">
    <div class="music-player-head">
      <img v-if="cover" :src="cover" :alt="title || '封面'" class="music-player-cover" loading="lazy">
      <div v-else class="music-player-cover music-player-cover-ph">
        <Icon name="mdi:music-note" class="w-5 h-5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-[var(--txt-90)]">{{ title || src }}</p>
        <p v-if="artist" class="mt-0.5 truncate text-xs text-[var(--txt-50)]">{{ artist }}</p>
      </div>
      <button
        class="music-player-btn"
        :disabled="!ready"
        :aria-label="playing ? '暂停' : '播放'"
        @click="ws?.playPause()"
      >
        <Icon :name="playing ? 'mdi:pause' : 'mdi:play'" class="w-5 h-5" :class="{ 'ml-0.5': !playing }" />
      </button>
    </div>
    <div class="music-player-body">
      <div ref="waveHost" class="music-player-wave" />
      <span class="music-player-time tabular-nums">{{ fmt(current) }} / {{ fmt(duration) }}</span>
    </div>
  </div>
</template>
