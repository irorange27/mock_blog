<script setup lang="ts">
// ::poly-score — 复合速度（polytempo）五线谱：每行一个声部，各自拍号/速度/音符序列，
// 共享同一条真实时间轴（混速时错拍按时间比例呈现）。abcjs 强制全谱公共小节线与速度，
// 画不了这种谱，所以直接用 SVG 按 SMuFL 度量自绘（Bravura 子集字体，本地加载）；
// 播放用 Web Audio 按音高合成旋律，无音色下载依赖。
//
// 用法：组件内放无语言围栏代码块，每行一个声部。
//   匀速脉冲行（无音符）：  4/4 @72 [bars=N]
//   逐音记谱行：            4/4 @60 c4 d4 e4 f4 | g4 a4 b4 c5 |
// 音符 token：音名[升降]八度 时值（可省略，默认四分），如 c4 / f#5e / bb3h. / r2
//   时值 w=全音符 h=二分 q=四分 e=八分 s=十六分，`.` 附点；r = 休止符
// 全部行同速且无音符时自动取整周期（最小公倍数拍数）对齐。

interface PNote {
  t: number      // 起始时刻（秒）
  dur: number    // 时值（秒）
  midi: number | null  // null = 休止符
  acc: string    // '' | '#' | 'b' | 'n'
  hd: 'w' | 'h' | 'q' | 'e' | 's'
  dots: number
  dia: number    // 音名字母的音级（C0=0 递增），决定谱上位置（升降号不改位置）
}

interface Part {
  num: number
  den: number
  bpm: number
  bars: number
  barsExplicit: boolean  // 用户写明 bars=N：等长补齐不得覆盖
  beats: number       // 脉冲行：拍点总数
  beatDur: number     // 一拍秒数（四分音符锚定）
  dur: number         // 声部总时长（秒）
  notes: PNote[] | null
  inst: string        // 合成音色（TIMBRES 的键）
}

const props = defineProps<{ staff?: boolean }>()
const staffMode = !!props.staff

const src = ref<HTMLElement | null>(null)
const rowsEl = ref<HTMLElement | null>(null)
const ready = ref(false)
const state = ref<'idle' | 'playing'>('idle')
const progress = ref(0)

const parts = ref<Part[]>([])
const total = ref(0)
const cycles = ref<number[]>([])

// 画布宽度：随内容密度自适应（音符带符尾/附点/升降号时保留右侧空间，
// 小节线不压音符），宽度反推自最小间距约束；下限 640，过密时靠横向滚动
const vbW = ref(640)
const ROW_H = staffMode ? 80 : 66
const PAD_L = staffMode ? 48 : 18
const PAD_R = 18

// 五线谱模式几何：1 谱距 = S 坐标单位，Bravura 以 font-size = 4 谱距渲染
const S = 6
const STAFF_TOP = 14
const STAFF_BOT = STAFF_TOP + 4 * S
const MID_Y = STAFF_TOP + 2 * S
const G_LINE_Y = STAFF_TOP + 3 * S
const CLEF_X = 10
const TS_CX = 36
const HEAD_HALF_W = 0.59 * S   // 符头半宽
const STEM_W = 0.12 * S        // 符干粗
const STEM_LEN = 3.5 * S       // 符干长
const GLYPH = {
  clef: '\uE050',
  notehead: '\uE0A4',
  noteheadHalf: '\uE0A3',
  noteheadWhole: '\uE0A2',
  dot: '\uE1E7',
  flag8Up: '\uE240',
  flag8Down: '\uE241',
  flag16Up: '\uE242',
  flag16Down: '\uE243',
  accSharp: '\uE262',
  accFlat: '\uE260',
  accNatural: '\uE261',
}
const REST_GLYPH: Record<string, string> = { w: '\uE4E1', h: '\uE4E2', e: '\uE4E3', s: '\uE4E4', q: '\uE4E5' }
const digitGlyphs = (n: number) =>
  String(Math.min(99, Math.max(0, n))).split('').map(d => String.fromCodePoint(0xe080 + Number(d))).join('')
const LETTER_SEMITONE = [0, 2, 4, 5, 7, 9, 11] // c d e f g a b
const LETTER_DIA = [0, 1, 2, 3, 4, 5, 6]
const DUR_QL: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 }

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a }
function lcm(a: number, b: number) { return a * b / gcd(a, b) }

function parseLine(line: string): { part: Part | null; notes: PNote[] | null } {
  let num = 0, den = 0, bpm = 0, bars = 0
  let barsWasSet = false
  let inst = ''
  const notes: PNote[] = []
  let cursorQ = 0

  for (const token of line.trim().split(/\s+/).filter(Boolean)) {
    let m = token.match(/^(\d+)\/(\d+)$/)
    if (m) { num = Number(m[1]); den = Number(m[2]); continue }
    m = token.match(/^@(\d+)$/)
    if (m) { bpm = Number(m[1]); continue }
    m = token.match(/^bars=(\d+)$/)
    if (m) { bars = Number(m[1]); barsWasSet = true; continue }
    m = token.match(/^inst=(\w+)$/)
    if (m) { inst = m[1]; continue }

    // 音符 / 休止符 token（LilyPond 风格）：
    //   音名 + 升降(#/b) + 八度标记('/,，默认 c=中央C 八度) + 时值数字 + 附点
    //   如 c4 d8 f#2 bb,4. c'4 r8；数字只可能是时值，八度只可能是 '/,，零歧义
    m = token.match(/^([a-gr])([#bn]?)([',]*)(\d{1,2})?(\.{0,2})$/)
    if (!m || !num || !bpm) continue
    const letter = m[1]
    const acc = m[2]
    const oct = 4 + (m[3].split("'").length - 1) - (m[3].split(',').length - 1)
    const DUR_Q: Record<string, number> = { '1': 4, '2': 2, '4': 1, '8': 0.5, '16': 0.25 }
    const durNum = m[4] && DUR_Q[m[4]] ? m[4] : '4'
    const hd = (durNum === '1' ? 'w' : durNum === '2' ? 'h' : durNum === '8' ? 'e' : durNum === '16' ? 's' : 'q') as PNote['hd']
    const dots = m[5].length
    const qDur = DUR_QL[hd] * (2 - Math.pow(2, -dots))
    const qSec = 60 / bpm
    let midi: number | null = null
    let dia = 0
    if (letter !== 'r') {
      const li = letter.charCodeAt(0) - 97
      midi = (oct + 1) * 12 + LETTER_SEMITONE[li] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0)
      dia = oct * 7 + LETTER_DIA[li]
    }
    notes.push({ t: cursorQ * qSec, dur: qDur * qSec, midi, acc: letter === 'r' ? '' : acc, hd, dots, dia })
    cursorQ += qDur
  }

  if (!num || !bpm) return { part: null, notes: null }
  const beatDur = 60 / bpm
  const barQ = num * (4 / den) // 一小节的四分音符数
  const hasNotes = notes.length > 0
  if (!hasNotes) {
    // 匀速脉冲行
    bars = Math.max(1, Math.min(16, bars || 4))
    if (bars * num > 64) bars = Math.max(1, Math.floor(64 / num))
    return {
      part: { num, den, bpm, bars, barsExplicit: barsWasSet, beats: bars * num, beatDur, dur: bars * num * beatDur, notes: null, inst: inst || 'click' },
      notes: null,
    }
  }
  // 逐音行：小节数取自内容（可被 bars= 扩充）
  bars = Math.max(bars, Math.ceil(cursorQ / barQ), 1)
  const dur = Math.max(cursorQ, bars * barQ) * beatDur
  return {
    part: { num, den, bpm, bars, barsExplicit: barsWasSet, beats: 0, beatDur, dur, notes, inst: inst || 'tone' },
    notes,
  }
}

function parseParts(text: string): Part[] {
  const out: Part[] = []
  for (const line of text.split('\n')) {
    const { part } = parseLine(line)
    if (part) out.push(part)
  }
  if (!out.length) return out
  // 同速纯脉冲行：按拍数最小公倍数取整周期（超过 24 拍放弃，谱面过长）；
  // 有显式 bars= 的行不参与自动取整
  if (
    new Set(out.map(p => p.bpm)).size === 1 &&
    out.every(p => !p.notes) &&
    out.every(p => !p.barsExplicit) &&
    !out.some(p => p.beats !== 4 * p.num)
  ) {
    const cycle = out.map(p => p.num).reduce((a, b) => lcm(a, b), 1)
    if (cycle <= 24) for (const p of out) p.bars = Math.max(1, Math.round(cycle / p.num))
    for (const p of out) { p.beats = p.bars * p.num; p.dur = p.beats * p.beatDur }
  }
  // 纯脉冲的混速组：把过短的行补齐到大致等长（显式 bars= 的行不动）
  const pulse = out.filter(p => !p.notes)
  if (pulse.length === out.length) {
    const t0 = Math.max(...pulse.map(p => p.dur))
    for (const p of pulse) {
      if (p.barsExplicit || p.dur >= t0 * 0.75) continue
      p.bars = Math.max(1, Math.min(16, Math.round(t0 / (p.num * p.beatDur))))
      if (p.bars * p.num > 64) p.bars = Math.max(1, Math.floor(64 / p.num))
      p.beats = p.bars * p.num
      p.dur = p.beats * p.beatDur
    }
  }
  return out
}

// t 是否落在声部 p 的小节线上（容差 5ms）
function isDown(p: Part, t: number) {
  const barSec = p.num * (4 / p.den) * p.beatDur
  const r = t % barSec
  return r < 0.005 || barSec - r < 0.005
}

onMounted(() => {
  parts.value = parseParts(src.value?.textContent ?? '')
  if (!parts.value.length) return
  total.value = Math.max(...parts.value.map(p => p.dur))
  const first = parts.value[0]
  const cand: number[] = []
  for (let b = 1; b <= first.bars; b++) cand.push(b * first.num * (4 / first.den) * first.beatDur)
  cycles.value = cand.filter(t => t <= total.value + 0.005 && parts.value.every(p => isDown(p, t)))
  vbW.value = Math.max(640, computeWidth(parts.value))
  ready.value = true
})

const x = (t: number) => PAD_L + (t / (total.value || 1)) * (vbW.value - PAD_L - PAD_R)

// 单个音符的右侧保留（符尾/附点向右延伸）与左侧保留（升降号向左延伸）
function noteRightPad(n: PNote): number {
  let r = HEAD_HALF_W
  if (n.hd === 'e' || n.hd === 's') r += 0.9 * S
  if (n.dots) r += 0.9 * S
  return r
}
function computeWidth(ps: Part[]): number {
  let need = 640
  for (const p of ps) {
    const pts = p.notes
      ? p.notes.map(n => ({ t: n.t, left: n.acc ? 1.69 * S + 1 : 1, right: noteRightPad(n) }))
      : Array.from({ length: p.beats }, (_, k) => ({ t: k * p.beatDur, left: 6, right: 6 }))
    if (pts.length < 2) continue
    // 相邻音符：x_i − left_i ≥ x_j + right_j + 间隙 → 解出最小画布宽（保时间比例）
    for (let i = 1; i < pts.length; i++) {
      const dt = pts[i].t - pts[i - 1].t
      if (dt <= 0.005) continue
      need = Math.max(need, PAD_L + PAD_R + (pts[i - 1].right + pts[i].left + 3) * total.value / dt)
    }
    // 小节线（bar 2 起）不与前一小节最后一个音符重叠
    for (let b = 2; b <= p.bars; b++) {
      const tb = (b - 1) * p.num * (4 / p.den) * p.beatDur
      const prev = pts.filter(pt => pt.t < tb - 0.005).pop()
      if (!prev) continue
      const dt = tb - prev.t
      if (dt <= 0.005) continue
      need = Math.max(need, PAD_L + PAD_R + (prev.right + 7) * total.value / dt)
    }
  }
  return Math.ceil(need)
}

// ── 记谱几何 ──
const noteY = (n: PNote) => n.midi === null ? MID_Y : MID_Y - (n.dia - 34) * (S / 2)
function ledgers(n: PNote): number[] {
  if (n.midi === null) return []
  const y = noteY(n)
  const out: number[] = []
  if (y < STAFF_TOP - 3) for (let ly = STAFF_TOP - S; ly >= y; ly -= S) out.push(ly)
  if (y > STAFF_BOT + 3) for (let ly = STAFF_BOT + S; ly <= y; ly += S) out.push(ly)
  return out
}
const stemUp = (n: PNote) => noteY(n) >= MID_Y
const stemX = (n: PNote) => x(n.t) + (stemUp(n) ? HEAD_HALF_W - STEM_W : -HEAD_HALF_W)
const stemY = (n: PNote) => stemUp(n) ? noteY(n) - STEM_LEN : noteY(n)
const accGlyph = (a: string) => a === '#' ? GLYPH.accSharp : a === 'b' ? GLYPH.accFlat : GLYPH.accNatural
const accX = (n: PNote) => x(n.t) - HEAD_HALF_W - 1.1 * S
const headGlyph = (n: PNote) => n.hd === 'w' ? GLYPH.noteheadWhole : n.hd === 'h' ? GLYPH.noteheadHalf : GLYPH.notehead
const dotY = (n: PNote) => noteY(n) + ((n.dia - 34) % 2 === 0 ? -S / 2 : 0)
const flagGlyph = (n: PNote) => {
  const up = stemUp(n)
  if (n.hd === 's') return up ? GLYPH.flag16Up : GLYPH.flag16Down
  return up ? GLYPH.flag8Up : GLYPH.flag8Down
}
const flagY = (n: PNote) => stemUp(n) ? noteY(n) - STEM_LEN : noteY(n) + STEM_LEN
const restY = (n: PNote) => n.hd === 'w' ? STAFF_TOP + S : MID_Y

// ── 播放：Web Audio。逐音行按音高合成旋律，脉冲行合成节拍 click ──
let ctx: AudioContext | null = null
let schedulerId: ReturnType<typeof setInterval> | null = null
let rafId = 0
let startTime = 0

// 合成音色表。增益按等响归一：
//   持续型按 RMS 匹配（波形 RMS 因子：square 1.0 / sine 0.707 / triangle·saw 0.577，相对峰值），
//   square/saw 谐波亮，在等 RMS 基础上再压 15–20%；
//   衰减型（click/pluck/bell）指数衰减天然 RMS 低，按起始峰值对齐持续型。
const TIMBRES: Record<string, { wave: OscillatorType; gain: number; decay: number; partial?: { ratio: number; gain: number } }> = {
  click:  { wave: 'sine', gain: 0.38, decay: 0.09 },
  tone:   { wave: 'triangle', gain: 0.225, decay: 0 },
  sine:   { wave: 'sine', gain: 0.19, decay: 0 },
  square: { wave: 'square', gain: 0.1, decay: 0.25 },
  saw:    { wave: 'sawtooth', gain: 0.19, decay: 0.22 },
  pluck:  { wave: 'triangle', gain: 0.3, decay: 0.55 },
  bell:   { wave: 'sine', gain: 0.2, decay: 1.6, partial: { ratio: 2.76, gain: 0.35 } },
}

// 按 inst 发一个音；midi 为 null 时用固定音高（无音高的声部也能指定音色）
function scheduleNote(when: number, midi: number, dur: number, inst: string, strong = false) {
  if (!ctx) return
  const t = TIMBRES[inst] ?? TIMBRES.tone
  const freq = 440 * Math.pow(2, (midi - 69) / 12)
  const voices: { ratio: number; gain: number }[] = [{ ratio: 1, gain: 1 }]
  if (t.partial) voices.push({ ratio: t.partial.ratio, gain: t.partial.gain })
  for (const v of voices) {
    const osc = ctx.createOscillator()
    osc.type = t.wave
    osc.frequency.value = freq * v.ratio
    const g = ctx.createGain()
    const peak = t.gain * v.gain * (strong && inst === 'click' ? 1.35 : 1)
    g.gain.setValueAtTime(0.0001, when)
    if (t.decay > 0) {
      g.gain.exponentialRampToValueAtTime(peak, when + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.06, t.decay))
    } else {
      g.gain.exponentialRampToValueAtTime(peak, when + 0.012)
      g.gain.setValueAtTime(peak * 0.8, when + Math.max(0.02, dur * 0.6))
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.92)
    }
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(when)
    osc.stop(when + Math.min(dur, t.decay + 0.1) + 0.05)
  }
}

async function start() {
  if (!parts.value.length || state.value === 'playing') return
  ctx = new AudioContext()
  // 等 ctx 真正 running 再锚定起点：resume 授权慢的环境里先锚定会推移时间轴
  await ctx.resume().catch(() => {})
  if (!ctx) return
  startTime = ctx.currentTime + 0.12
  const qDur = parts.value.map(p => 60 / p.bpm)
  const tick = () => {
    if (!ctx) return
    const ahead = ctx.currentTime + 0.18
    parts.value.forEach((p, i) => {
      if (p.notes) {
        while (head[i] < p.notes.length && startTime + p.notes[head[i]].t < ahead) {
          const n = p.notes[head[i]]
          if (n.midi !== null) scheduleNote(startTime + n.t, n.midi, n.dur, p.inst)
          head[i]++
        }
      } else {
        while (head[i] < p.beats && startTime + head[i] * qDur[i] < ahead) {
          if (p.inst === 'click') scheduleNote(startTime + head[i] * qDur[i], head[i] % p.num === 0 ? 91 : 84, 0.12, 'click', head[i] % p.num === 0)
          else scheduleNote(startTime + head[i] * qDur[i], head[i] % p.num === 0 ? 91 : 84, qDur[i], p.inst, head[i] % p.num === 0)
          head[i]++
        }
      }
    })
  }
  const head: number[] = parts.value.map(() => 0)
  tick()
  schedulerId = setInterval(tick, 40)
  state.value = 'playing'
  const frame = () => {
    if (!ctx) return
    const t = ctx.currentTime - startTime
    progress.value = Math.min(1, Math.max(0, t / total.value))
    if (t >= total.value + 0.15) { stop(); return }
    rafId = requestAnimationFrame(frame)
  }
  rafId = requestAnimationFrame(frame)
}

function stop() {
  if (schedulerId) clearInterval(schedulerId)
  schedulerId = null
  cancelAnimationFrame(rafId)
  ctx?.close()
  ctx = null
  progress.value = 0
  state.value = 'idle'
}

function toggle() { state.value === 'playing' ? stop() : start() }

// 横向可滚动（窄屏）。播放头只映射时间轴区间（拍号之后 → 结束线）：
// 起点 = 第一个音符的位置，不扫过谱号/拍号这段非时间区
const headStyle = computed(() => {
  const w = rowsEl.value?.scrollWidth ?? 0
  const px = w * (PAD_L + progress.value * (vbW.value - PAD_L - PAD_R)) / vbW.value
  return { transform: `translateX(${px}px)` }
})

onBeforeUnmount(stop)
</script>

<template>
  <div class="poly-score">
    <!-- 谱面定义原文：仅供解析，不展示 -->
    <div ref="src" aria-hidden="true" class="poly-score-src"><slot /></div>
    <template v-if="ready">
      <div class="poly-score-grid">
        <div class="poly-score-labels">
          <span v-for="(p, i) in parts" :key="i" class="poly-score-label">
            {{ p.num }}/{{ p.den }} · ♩={{ p.bpm }}
          </span>
        </div>
        <div ref="rowsEl" class="poly-score-rows">
          <svg
            v-for="(p, i) in parts" :key="i" class="poly-score-row"
            :viewBox="`0 0 ${vbW} ${ROW_H}`" aria-hidden="true"
          >
            <template v-if="staffMode">
              <!-- 五线 -->
              <line
                v-for="l in 5" :key="`l${l}`"
                x1="8" :x2="vbW - 8"
                :y1="STAFF_TOP + (l - 1) * S" :y2="STAFF_TOP + (l - 1) * S"
                class="poly-score-staffline"
              />
              <!-- 对齐点虚线（各声部小节线重合处，与小节线同位） -->
              <line
                v-for="t in cycles" :key="`c${t}`"
                :x1="x(t) - 11" :x2="x(t) - 11" :y1="10" :y2="ROW_H - 20"
                class="poly-score-cycle"
              />
              <!-- 谱号（G 谱号基线在第 2 线）与拍号（分子分母各占中线上下两谱距） -->
              <text class="poly-score-glyph poly-score-ink" :x="CLEF_X" :y="G_LINE_Y">{{ GLYPH.clef }}</text>
              <text class="poly-score-glyph poly-score-ink" text-anchor="middle" :x="TS_CX" :y="MID_Y - S">{{ digitGlyphs(p.num) }}</text>
              <text class="poly-score-glyph poly-score-ink" text-anchor="middle" :x="TS_CX" :y="MID_Y + S">{{ digitGlyphs(p.den) }}</text>
              <!-- 小节线（第 2 小节起，画在下拍圆点左侧留白处）+ 小节号 -->
              <template v-for="b in p.bars" :key="`b${b}`">
                <line
                  v-if="b > 1"
                  :x1="x((b - 1) * p.num * (4 / p.den) * p.beatDur) - 11" :x2="x((b - 1) * p.num * (4 / p.den) * p.beatDur) - 11"
                  :y1="STAFF_TOP" :y2="STAFF_BOT"
                  class="poly-score-barline"
                />
                <text
                  :x="x((b - 1) * p.num * (4 / p.den) * p.beatDur) - 12" :y="ROW_H - 8" class="poly-score-num"
                >{{ b }}</text>
              </template>
              <!-- 逐音记谱 -->
              <template v-if="p.notes">
                <template v-for="(n, ni) in p.notes" :key="ni">
                  <line
                    v-for="ly in ledgers(n)" :key="`ld${ni}${ly}`"
                    :x1="x(n.t) - 4.5" :x2="x(n.t) + 4.5" :y1="ly" :y2="ly"
                    class="poly-score-staffline"
                  />
                  <text
                    v-if="n.acc" class="poly-score-glyph poly-score-ink"
                    :x="accX(n)" :y="noteY(n)"
                  >{{ accGlyph(n.acc) }}</text>
                  <g class="poly-score-ink">
                    <text v-if="n.midi === null" class="poly-score-glyph" :x="x(n.t)" :y="restY(n)">{{ REST_GLYPH[n.hd] }}</text>
                    <template v-else>
                      <rect v-if="n.hd !== 'w'" :x="stemX(n)" :y="stemY(n)" :width="STEM_W" :height="STEM_LEN + STEM_W" />
                      <text
                        v-if="n.hd === 'e' || n.hd === 's'" class="poly-score-glyph"
                        :x="stemX(n) + (stemUp(n) ? -0.2 : -0.2)" :y="flagY(n)"
                      >{{ flagGlyph(n) }}</text>
                      <text class="poly-score-glyph" text-anchor="middle" :x="x(n.t)" :y="noteY(n)">{{ headGlyph(n) }}</text>
                      <text
                        v-if="n.dots" class="poly-score-glyph"
                        :x="x(n.t) + HEAD_HALF_W + 0.75 * S" :y="dotY(n)"
                      >{{ GLYPH.dot }}</text>
                    </template>
                  </g>
                </template>
              </template>
              <!-- 匀速脉冲：强拍实心主色，弱拍描边 -->
              <template v-else>
                <circle
                  v-for="k in p.beats" :key="`k${k}`"
                  :cx="x((k - 1) * p.beatDur)" :cy="MID_Y"
                  :r="k % p.num === 1 ? 8 : 5"
                  :class="k % p.num === 1 ? 'poly-score-strong' : 'poly-score-weak'"
                />
              </template>
              <!-- 结束小节线（细 + 粗） -->
              <line :x1="x(p.dur) + 3" :x2="x(p.dur) + 3" :y1="STAFF_TOP" :y2="STAFF_BOT" class="poly-score-barline" />
              <rect :x="x(p.dur) + 6" :y="STAFF_TOP" width="2.2" :height="STAFF_BOT - STAFF_TOP" class="poly-score-barline-fill" />
            </template>
            <template v-else>
              <!-- 对齐点虚线（各声部小节线重合处，与小节线同位） -->
              <line
                v-for="t in cycles" :key="`c${t}`"
                :x1="x(t) - 9.5" :x2="x(t) - 9.5" :y1="8" :y2="ROW_H - 16"
                class="poly-score-cycle"
              />
              <!-- 小节线（第 2 小节起）+ 小节号 -->
              <template v-for="b in p.bars" :key="`b${b}`">
                <line
                  v-if="b > 1"
                  :x1="x((b - 1) * p.num * p.beatDur) - 9.5" :x2="x((b - 1) * p.num * p.beatDur) - 9.5"
                  :y1="14" y2="48"
                  class="poly-score-barline"
                />
                <text
                  :x="x((b - 1) * p.num * p.beatDur) - 4" :y="ROW_H - 8" class="poly-score-num"
                >{{ b }}</text>
              </template>
              <!-- 拍点：强拍实心主色，弱拍描边 -->
              <circle
                v-for="k in p.beats" :key="`k${k}`"
                :cx="x((k - 1) * p.beatDur)" cy="30"
                :r="k % p.num === 1 ? 7.5 : 4.8"
                :class="k % p.num === 1 ? 'poly-score-strong' : 'poly-score-weak'"
              />
              <!-- 声部结束线 -->
              <line :x1="x(p.dur) + 4" :x2="x(p.dur) + 4" y1="14" y2="46" class="poly-score-barline" />
            </template>
          </svg>
          <div v-show="state === 'playing'" class="poly-score-head" :style="headStyle" />
        </div>
      </div>
      <div class="abc-score-bar">
        <button class="abc-score-play" @click="toggle">
          <Icon :name="state === 'playing' ? 'mdi:stop' : 'mdi:play'" class="w-3.5 h-3.5" :class="{ 'ml-0.5': state !== 'playing' }" />
          <span>{{ state === 'playing' ? '停止' : '播放' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>
